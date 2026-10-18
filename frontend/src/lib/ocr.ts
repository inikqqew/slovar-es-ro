import { createWorker } from 'tesseract.js'

// Страница целиком — нужна более высокая детализация, чем для одного слова
const MAX_DIMENSION = 2400

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context недоступен')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось сжать изображение'))),
      'image/jpeg',
      0.9,
    )
  })
}

export interface OcrToken {
  raw: string // как на странице (с пунктуацией)
  word: string | null // очищенное слово для перевода, null — не слово (число, знак)
}

export type OcrLine = OcrToken[]

function clean(raw: string): string | null {
  const w = raw.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
  return w.length >= 2 && /^[\p{L}'’-]+$/u.test(w) ? w : null
}

export async function recognizePage(
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<OcrLine[]> {
  const worker = await createWorker(['spa', 'ron'], undefined, {
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
            .map((w) => w.text.trim())
            .filter(Boolean)
            .map((raw) => ({ raw, word: clean(raw) }))
          if (tokens.length) lines.push(tokens)
        }
      }
    }
    return lines
  } finally {
    await worker.terminate()
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
