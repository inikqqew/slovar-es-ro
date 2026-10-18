import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { detectLanguage, otherLanguage, translateText } from '../lib/translate.js'
import { analyzeWord } from '../lib/wordAnalysis.js'
import { fetchDex } from '../lib/dex.js'
import { optionalAnonUser } from '../lib/anonUser.js'

export const wordsRouter = Router()

wordsRouter.get('/lookup', optionalAnonUser, async (req, res) => {
  const raw = req.query.text
  if (typeof raw !== 'string' || !raw.trim()) {
    return res.status(400).json({ error: 'Параметр text обязателен' })
  }
  const text = raw.trim().toLowerCase()

  try {
    // ?lang=es|ro — ручное переопределение, если авто-определение ошиблось
    const forced = req.query.lang
    const language = forced === 'es' || forced === 'ro' ? forced : await detectLanguage(text)

    let word = await prisma.word.findFirst({
      where: { text, language, isCustom: false },
      orderBy: { createdAt: 'desc' },
    })
    let wasCached = Boolean(word)

    if (!word) {
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

      // Значение всегда на румынском: для румынского слова — его статья в DEX,
      // для испанского — статья DEX его румынского перевода.
      const [dex, analysis] = await Promise.all([
        fetchDex(language === 'ro' ? text : translation.toLowerCase()),
        analyzeWord({ text, language, translation }),
      ])

      const verifiedByAi = Boolean(analysis?.verified)
      word = await prisma.word.create({
        data: {
          text,
          language,
          translation,
          meaning: dex?.meaning ?? analysis?.meaningRo ?? 'Значение не найдено в словаре DEX.',
          partOfSpeech: dex?.partOfSpeech ?? analysis?.partOfSpeech ?? null,
          gender: dex?.gender ?? analysis?.gender ?? null,
          examples: analysis?.examples ?? [],
          status: dex ? 'source_verified' : verifiedByAi ? 'ai_verified' : 'unverified',
          source: dex ? 'dexonline' : analysis ? 'ai' : null,
          isCustom: false,
        },
      })
    }

    let savedByMe = false
    if (req.userId) {
      const saved = await prisma.savedWord.findUnique({
        where: { userId_wordId: { userId: req.userId, wordId: word.id } },
      })
      savedByMe = Boolean(saved)
    }

    res.json({ ...word, examples: word.examples as string[], cached: wasCached, savedByMe })
  } catch (err) {
    console.error('Word lookup failed:', err)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})
