import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { detectLanguage, otherLanguage, translateText } from '../lib/translate.js'
import { analyzeWord } from '../lib/wordAnalysis.js'

export const wordsRouter = Router()

wordsRouter.get('/lookup', async (req, res) => {
  const raw = req.query.text
  if (typeof raw !== 'string' || !raw.trim()) {
    return res.status(400).json({ error: 'Параметр text обязателен' })
  }
  const text = raw.trim().toLowerCase()

  try {
    const language = await detectLanguage(text)

    const cached = await prisma.word.findFirst({
      where: { text, language, isCustom: false },
      orderBy: { createdAt: 'desc' },
    })
    if (cached) {
      return res.json({ ...cached, examples: cached.examples as string[], cached: true })
    }

    const target = otherLanguage(language)
    let translation: string
    try {
      translation = await translateText(text, language, target)
    } catch (err) {
      console.error('Translate failed:', err)
      return res.status(502).json({
        error: 'Сервис перевода временно недоступен. Попробуйте ещё раз через несколько секунд.',
      })
    }

    const analysis = await analyzeWord({ text, language, translation })

    const word = await prisma.word.create({
      data: {
        text,
        language,
        translation,
        meaning: analysis?.meaningRo ?? 'Значение уточняется — AI-верификация недоступна.',
        partOfSpeech: analysis?.partOfSpeech ?? null,
        gender: analysis?.gender ?? null,
        examples: analysis?.examples ?? [],
        status: analysis ? (analysis.verified ? 'ai_verified' : 'unverified') : 'unverified',
        source: analysis ? 'ai' : null,
        isCustom: false,
      },
    })

    res.json({ ...word, examples: word.examples as string[], cached: false })
  } catch (err) {
    console.error('Word lookup failed:', err)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})
