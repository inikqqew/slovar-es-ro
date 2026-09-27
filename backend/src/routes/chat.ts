import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAnonUser } from '../lib/anonUser.js'
import { generateReply, type ChatMessage } from '../lib/chatBot.js'

export const chatRouter = Router()
chatRouter.use(requireAnonUser)

function isLanguage(v: unknown): v is 'es' | 'ro' {
  return v === 'es' || v === 'ro'
}

// GET /api/chat?language=es|ro — найти или создать сессию для этого языка
chatRouter.get('/', async (req, res) => {
  const userId = req.userId!
  const language = req.query.language
  if (!isLanguage(language)) {
    return res.status(400).json({ error: 'Параметр language должен быть es или ro' })
  }

  let session = await prisma.chatSession.findFirst({
    where: { userId, language },
    orderBy: { updatedAt: 'desc' },
  })
  if (!session) {
    session = await prisma.chatSession.create({ data: { userId, language, messages: [] } })
  }

  res.json({
    id: session.id,
    language: session.language,
    messages: session.messages as unknown as ChatMessage[],
  })
})

// POST /api/chat/:id/messages — отправить сообщение, получить ответ бота
chatRouter.post('/:id/messages', async (req, res) => {
  const userId = req.userId!
  const { id } = req.params
  const { text } = req.body ?? {}

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text обязателен' })
  }

  const session = await prisma.chatSession.findUnique({ where: { id } })
  if (!session || session.userId !== userId) {
    return res.status(404).json({ error: 'Сессия не найдена' })
  }
  if (!isLanguage(session.language)) {
    return res.status(500).json({ error: 'Некорректный язык сессии' })
  }

  const history = session.messages as unknown as ChatMessage[]
  const userMessage: ChatMessage = { role: 'user', content: text.trim() }

  let reply: string
  try {
    reply = await generateReply(session.language, [...history, userMessage])
  } catch (err) {
    console.error('Chat bot reply failed:', err)
    return res.status(502).json({ error: 'Не удалось получить ответ от чат-бота. Попробуйте ещё раз.' })
  }

  const assistantMessage: ChatMessage = { role: 'assistant', content: reply }
  const messages = [...history, userMessage, assistantMessage]

  await prisma.chatSession.update({ where: { id }, data: { messages: messages as unknown as object } })

  res.json({ messages })
})
