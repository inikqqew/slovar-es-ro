import { createWorker } from 'tesseract.js'

const MAX_DIMENSION = 1600 // снижает время OCR и нагрузку на память на телефоне

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
      0.85,
    )
  })
}

export interface OcrWord {
  text: string
  confidence: number
}

export async function recognizeWords(
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<OcrWord[]> {
  const worker = await createWorker(['spa', 'ron'], undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })

  try {
    const {
      data: { blocks },
    } = await worker.recognize(image, {}, { blocks: true })

    const allWords = (blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((p) => p.lines.flatMap((line) => line.words)),
    )

    const seen = new Set<string>()
    const result: OcrWord[] = []
    for (const w of allWords) {
      const clean = w.text.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
      if (clean.length < 2) continue
      const key = clean.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ text: clean, confidence: w.confidence })
    }
    return result
  } finally {
    await worker.terminate()
  }
}
