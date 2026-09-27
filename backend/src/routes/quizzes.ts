import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAnonUser } from '../lib/anonUser.js'

export const quizzesRouter = Router()
quizzesRouter.use(requireAnonUser)

const QUIZ_TYPES = ['fill_blank', 'multiple_choice', 'flashcard', 'matching', 'spelling'] as const
type QuizType = (typeof QUIZ_TYPES)[number]

const MIN_INTERVAL_HOURS = 4 // повтор почти сразу после ошибки
const MAX_INTERVAL_HOURS = 30 * 24 // максимум раз в 30 дней

// GET /api/quizzes/progress — вся статистика пользователя (для due-слов и общих цифр)
quizzesRouter.get('/progress', async (req, res) => {
  const progress = await prisma.quizProgress.findMany({ where: { userId: req.userId! } })
  res.json(progress)
})

// POST /api/quizzes/progress — записать результат попытки и пересчитать интервал
// повторения (упрощённая версия SM-2/Anki: интервал удваивается при верном
// ответе и падает почти до нуля при ошибке — полноценные "лёгкость"-коэффициенты
// оставлены на будущее).
quizzesRouter.post('/progress', async (req, res) => {
  const userId = req.userId!
  const { wordId, quizType, correct } = req.body ?? {}

  if (typeof wordId !== 'string' || !QUIZ_TYPES.includes(quizType) || typeof correct !== 'boolean') {
    return res.status(400).json({ error: 'wordId, quizType и correct (boolean) обязательны' })
  }

  const word = await prisma.word.findUnique({ where: { id: wordId } })
  if (!word) return res.status(404).json({ error: 'Слово не найдено' })

  const existing = await prisma.quizProgress.findUnique({
    where: { userId_wordId_quizType: { userId, wordId, quizType: quizType as QuizType } },
  })

  const attempts = (existing?.attempts ?? 0) + 1
  const successRate = existing
    ? (existing.successRate * existing.attempts + (correct ? 100 : 0)) / attempts
    : correct
      ? 100
      : 0

  const now = Date.now()
  const priorIntervalHours = existing
    ? Math.max(1, (existing.nextReviewAt.getTime() - existing.updatedAt.getTime()) / 3_600_000)
    : 24
  const intervalHours = correct
    ? Math.min(priorIntervalHours * 2, MAX_INTERVAL_HOURS)
    : MIN_INTERVAL_HOURS

  const progress = await prisma.quizProgress.upsert({
    where: { userId_wordId_quizType: { userId, wordId, quizType: quizType as QuizType } },
    create: {
      userId,
      wordId,
      quizType: quizType as QuizType,
      attempts: 1,
      successRate: correct ? 100 : 0,
      nextReviewAt: new Date(now + intervalHours * 3_600_000),
    },
    update: {
      attempts,
      successRate,
      nextReviewAt: new Date(now + intervalHours * 3_600_000),
    },
  })

  res.json(progress)
})
