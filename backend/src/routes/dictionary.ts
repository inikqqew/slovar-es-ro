import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAnonUser } from '../lib/anonUser.js'
import { analyzeWord } from '../lib/wordAnalysis.js'
import type { SupportedLanguage } from '../lib/translate.js'

export const dictionaryRouter = Router()
dictionaryRouter.use(requireAnonUser)

function serialize<T extends { examples: unknown }>(word: T, savedByMe = true) {
  return { ...word, examples: word.examples as string[], savedByMe }
}

// GET /api/dictionary?language=es|ro&status=...&q=поиск
dictionaryRouter.get('/', async (req, res) => {
  const userId = req.userId!
  const { language, status, q } = req.query as Record<string, string | undefined>

  const textFilter = q?.trim() ? { text: { contains: q.trim().toLowerCase() } } : {}
  const languageFilter = language ? { language } : {}
  const statusFilter = status ? { status } : {}

  const [ownWords, saved] = await Promise.all([
    prisma.word.findMany({
      where: { ownerId: userId, isCustom: true, ...languageFilter, ...statusFilter, ...textFilter },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.savedWord.findMany({
      where: { userId, word: { ...languageFilter, ...statusFilter, ...textFilter } },
      include: { word: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const items = [
    ...ownWords.map((w) => serialize(w)),
    ...saved.map((s) => serialize(s.word)),
  ].sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())

  res.json(items)
})

// POST /api/dictionary/words — ручное добавление (ТЗ 4.3)
dictionaryRouter.post('/words', async (req, res) => {
  const userId = req.userId!
  const { text, language, translation, meaning, example } = req.body ?? {}

  if (
    typeof text !== 'string' ||
    !text.trim() ||
    (language !== 'es' && language !== 'ro') ||
    typeof translation !== 'string' ||
    !translation.trim() ||
    typeof meaning !== 'string' ||
    !meaning.trim()
  ) {
    return res.status(400).json({ error: 'text, language (es/ro), translation и meaning обязательны' })
  }

  const analysis = await analyzeWord({
    text: text.trim(),
    language: language as SupportedLanguage,
    translation: translation.trim(),
  })

  const word = await prisma.word.create({
    data: {
      text: text.trim().toLowerCase(),
      language,
      translation: translation.trim(),
      meaning: meaning.trim(),
      examples: example && typeof example === 'string' ? [example.trim()] : [],
      status: analysis ? (analysis.verified ? 'ai_verified' : 'unverified') : 'unverified',
      source: analysis ? 'ai' : 'user',
      isCustom: true,
      ownerId: userId,
    },
  })

  res.status(201).json(serialize(word))
})

// PATCH /api/dictionary/words/:id — редактирование своего слова
dictionaryRouter.patch('/words/:id', async (req, res) => {
  const userId = req.userId!
  const { id } = req.params
  const existing = await prisma.word.findUnique({ where: { id } })
  if (!existing || existing.ownerId !== userId || !existing.isCustom) {
    return res.status(404).json({ error: 'Слово не найдено в вашем словаре' })
  }

  const { translation, meaning, example } = req.body ?? {}
  const data: Record<string, unknown> = {}
  if (typeof translation === 'string' && translation.trim()) data.translation = translation.trim()
  if (typeof meaning === 'string' && meaning.trim()) data.meaning = meaning.trim()
  if (typeof example === 'string') data.examples = example.trim() ? [example.trim()] : []

  const updated = await prisma.word.update({ where: { id }, data })
  res.json(serialize(updated))
})

// DELETE /api/dictionary/words/:id — удаление своего слова
dictionaryRouter.delete('/words/:id', async (req, res) => {
  const userId = req.userId!
  const { id } = req.params
  const existing = await prisma.word.findUnique({ where: { id } })
  if (!existing || existing.ownerId !== userId || !existing.isCustom) {
    return res.status(404).json({ error: 'Слово не найдено в вашем словаре' })
  }
  await prisma.word.delete({ where: { id } })
  res.status(204).end()
})

// POST /api/dictionary/save/:wordId — сохранить общее (не своё) слово в личный словарь
dictionaryRouter.post('/save/:wordId', async (req, res) => {
  const userId = req.userId!
  const { wordId } = req.params
  const word = await prisma.word.findUnique({ where: { id: wordId } })
  if (!word) return res.status(404).json({ error: 'Слово не найдено' })

  await prisma.savedWord.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: { userId, wordId },
    update: {},
  })
  res.status(201).json({ saved: true })
})

// DELETE /api/dictionary/save/:wordId — убрать из личного словаря
dictionaryRouter.delete('/save/:wordId', async (req, res) => {
  const userId = req.userId!
  const { wordId } = req.params
  await prisma.savedWord
    .delete({ where: { userId_wordId: { userId, wordId } } })
    .catch(() => null)
  res.status(204).end()
})
