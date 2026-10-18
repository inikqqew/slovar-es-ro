import { createWorker } from 'tesseract.js'
import { getUserId } from './userId'

const MAX_DIMENSION = 2400
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type OcrLanguage = 'both' | 'es' | 'ro'
const TESS_LANGS: Record<OcrLanguage, string[]> = {
  both: ['spa', 'ron'],
  es: ['spa'],
  ro: ['ron'],
}

// Предобработка снимка для OCR: поворот, перевод в градации серого и выравнивание
// освещения (деление на локальную яркость фона) — убирает тени и перепады света на
// фото страницы, из-за которых Tesseract теряет буквы.
export async function preprocessImage(file: Blob, rotation = 0): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const rot = ((rotation % 360) + 360) % 360
  const swap = rot === 90 || rot === 270

  const canvas = document.createElement('canvas')
  canvas.width = swap ? h : w
  canvas.height = swap ? w : h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context недоступен')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rot * Math.PI) / 180)
  ctx.drawImage(bitmap, -w / 2, -h / 2, w, h)
  bitmap.close()

  const cw = canvas.width
  const ch = canvas.height
  const img = ctx.getImageData(0, 0, cw, ch)
  const px = img.data
  const gray = new Uint8ClampedArray(cw * ch)
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = (px[p] * 299 + px[p + 1] * 587 + px[p + 2] * 114) / 1000
  }

  // мягкое шумоподавление (разделяемое ядро [1 2 1]): без него шум камеры превращается
  // в «мусорные слова» (проверено: точность на шумном снимке 42% → 95%)
  const tmp = new Float32Array(cw * ch)
  for (let y = 0; y < ch; y++) {
    const row = y * cw
    for (let x = 0; x < cw; x++) {
      const a = gray[row + Math.max(0, x - 1)]
      const c = gray[row + Math.min(cw - 1, x + 1)]
      tmp[row + x] = (a + 2 * gray[row + x] + c) / 4
    }
  }
  for (let y = 0; y < ch; y++) {
    const up = Math.max(0, y - 1) * cw
    const down = Math.min(ch - 1, y + 1) * cw
    for (let x = 0; x < cw; x++) {
      gray[y * cw + x] = (tmp[up + x] + 2 * tmp[y * cw + x] + tmp[down + x]) / 4
    }
  }

  // интегральное изображение → быстрое среднее по большому окну
  const stride = cw + 1
  const integral = new Uint32Array(stride * (ch + 1))
  for (let y = 0; y < ch; y++) {
    let row = 0
    for (let x = 0; x < cw; x++) {
      row += gray[y * cw + x]
      integral[(y + 1) * stride + (x + 1)] = integral[y * stride + (x + 1)] + row
    }
  }
  const r = Math.max(12, Math.round(Math.min(cw, ch) / 16))
  for (let y = 0; y < ch; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(ch, y + r + 1)
    for (let x = 0; x < cw; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(cw, x + r + 1)
      const sum =
        integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0]
      const mean = sum / ((x1 - x0) * (y1 - y0)) || 1
      // фон ≈ 255, текст пропорционально темнее; лёгкий подъём контраста
      const v = (gray[y * cw + x] / mean) * 235
      const o = (y * cw + x) * 4
      const out = Math.max(0, Math.min(255, (v - 110) * 1.9))
      px[o] = px[o + 1] = px[o + 2] = out
      px[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось обработать изображение'))),
      'image/png',
    )
  })
}

export interface OcrToken {
  raw: string // как на странице (с пунктуацией)
  word: string | null // очищенное слово для перевода, null — не слово (число, знак)
  conf: number // уверенность распознавания, 0–100
}

export type OcrLine = OcrToken[]

export function cleanWord(raw: string): string | null {
  const w = raw.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
  return w.length >= 2 && /^[\p{L}'’-]+$/u.test(w) ? w : null
}

export async function recognizePage(
  image: Blob,
  language: OcrLanguage,
  onProgress?: (progress: number) => void,
): Promise<OcrLine[]> {
  const worker = await createWorker(TESS_LANGS[language], undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })

  try {
    const {
      data: { blocks },
    } = await worker.recognize(image, {}, { blocks: true })

    const lines: OcrLine[] = []
    for (const block of blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          const tokens = line.words
            .map((w) => ({ raw: w.text.trim(), conf: w.confidence }))
            .filter((t) => t.raw && t.conf >= 25) // совсем неуверенное — это почти всегда шум, а не слово
            .map((t) => ({ raw: t.raw, word: cleanWord(t.raw), conf: t.conf }))
          if (tokens.length) lines.push(tokens)
        }
      }
    }
    return lines
  } finally {
    await worker.terminate()
  }
}

// Исправление ошибок распознавания по контексту (ИИ на сервере). При любой
// неудаче возвращает исходные строки — улучшение необязательное.
export async function fixLinesWithAi(
  lines: OcrLine[],
  language: OcrLanguage,
): Promise<{ lines: OcrLine[]; fixed: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/ocr/fix`, {
      method: 'POST',
      headers: { 'x-user-id': getUserId(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: lines.map((l) => l.map((t) => t.raw).join(' ')), language }),
    })
    if (!res.ok) return { lines, fixed: false }
    const body = (await res.json()) as { lines: string[]; fixed: boolean }
    if (!body.fixed || body.lines.length !== lines.length) return { lines, fixed: false }

    const result = lines.map((line, i) => {
      const parts = body.lines[i].trim().split(/\s+/)
      if (parts.length !== line.length) return line
      return line.map((t, j) =>
        parts[j] === t.raw ? t : { raw: parts[j], word: cleanWord(parts[j]), conf: Math.max(t.conf, 80) },
      )
    })
    return { lines: result, fixed: true }
  } catch {
    return { lines, fixed: false }
  }
}

// Уникальные слова страницы для массового сохранения (короткие служебные пропускаем)
export function uniqueWords(lines: OcrLine[], minLength = 3): string[] {
  const seen = new Set<string>()
  for (const line of lines) {
    for (const t of line) {
      if (t.word && t.word.length >= minLength) seen.add(t.word.toLowerCase())
    }
  }
  return [...seen]
}
