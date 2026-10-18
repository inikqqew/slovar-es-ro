import { Router } from 'express'
import { requireAnonUser } from '../lib/anonUser.js'
import { isLlmConfigured, llmComplete } from '../lib/llm.js'

export const ocrRouter = Router()
ocrRouter.use(requireAnonUser)

const LANG_HINT: Record<string, string> = {
  es: 'Spanish',
  ro: 'Romanian',
  both: 'Spanish or Romanian',
}

const SYSTEM = (lang: string) => `You fix OCR recognition errors in text from a book page written in ${lang}.
Rules:
- You get a JSON array of lines. Return ONLY a JSON array of strings: the corrected lines, same count, same order.
- Every line must keep EXACTLY the same number of whitespace-separated words as the input line.
- Fix only obvious recognition errors: wrong or confused letters (rn/m, l/I/1, 0/O, c/e), and missing or wrong diacritics (ă â î ș ț á é í ó ú ñ ü ¿ ¡).
- Do not translate, rephrase, merge or split words. If unsure, keep the original word.`

// POST /api/ocr/fix — исправление ошибок распознавания по контексту (если подключён LLM)
ocrRouter.post('/fix', async (req, res) => {
  const { lines, language } = req.body ?? {}
  if (!Array.isArray(lines) || lines.some((l) => typeof l !== 'string')) {
    return res.status(400).json({ error: 'lines должен быть массивом строк' })
  }
  const total = lines.reduce((s: number, l: string) => s + l.length, 0)
  if (lines.length === 0 || lines.length > 300 || total > 30_000) {
    return res.status(400).json({ error: 'Слишком большой или пустой текст' })
  }
  if (!isLlmConfigured()) return res.json({ lines, fixed: false })

  try {
    const reply = await llmComplete({
      system: SYSTEM(LANG_HINT[language] ?? LANG_HINT.both),
      messages: [{ role: 'user', content: JSON.stringify(lines) }],
      maxTokens: Math.min(6000, Math.ceil(total / 2) + 400),
    })
    const match = reply.match(/\[[\s\S]*\]/)
    const parsed: unknown = match ? JSON.parse(match[0]) : null
    if (!Array.isArray(parsed) || parsed.length !== lines.length) return res.json({ lines, fixed: false })

    const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
    const result = (lines as string[]).map((orig, i) => {
      const fixed = parsed[i]
      return typeof fixed === 'string' && wordCount(fixed) === wordCount(orig) ? fixed : orig
    })
    res.json({ lines: result, fixed: result.some((l, i) => l !== lines[i]) })
  } catch (err) {
    console.error('OCR fix failed:', err)
    res.json({ lines, fixed: false })
  }
})
