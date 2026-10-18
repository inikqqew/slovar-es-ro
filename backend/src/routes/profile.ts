import { Router } from 'express'
import { randomInt } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { requireAnonUser } from '../lib/anonUser.js'

export const profileRouter = Router()
profileRouter.use(requireAnonUser)

const CODE_TTL_MS = 10 * 60 * 1000
// без похожих символов (0/O, 1/I/L), чтобы код легко вводить с телефона
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  const raw = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}

// простая защита от перебора кодов: не больше 10 попыток в минуту с одного адреса
const attempts = new Map<string, number[]>()
function tooManyAttempts(ip: string): boolean {
  const now = Date.now()
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  attempts.set(ip, recent)
  return recent.length > 10
}

// POST /api/profile/transfer-code — получить код для подключения другого устройства
profileRouter.post('/transfer-code', async (req, res) => {
  const userId = req.userId!
  await prisma.transferCode.deleteMany({ where: { OR: [{ userId }, { expiresAt: { lt: new Date() } }] } })
  const code = generateCode()
  const expiresAt = new Date(Date.now() + CODE_TTL_MS)
  await prisma.transferCode.create({ data: { code, userId, expiresAt } })
  res.json({ code, expiresAt })
})

// POST /api/profile/redeem {code} — подключить ЭТО устройство к профилю с другого:
// данные текущего (локального) профиля переносятся в целевой, код сгорает.
profileRouter.post('/redeem', async (req, res) => {
  if (tooManyAttempts(req.ip ?? 'unknown')) {
    return res.status(429).json({ error: 'Слишком много попыток. Подождите минуту.' })
  }
  const input = typeof req.body?.code === 'string' ? req.body.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
  if (input.length !== 8) return res.status(400).json({ error: 'Код состоит из 8 символов' })
  const code = `${input.slice(0, 4)}-${input.slice(4)}`

  const entry = await prisma.transferCode.findUnique({ where: { code } })
  if (!entry || entry.expiresAt < new Date()) {
    return res.status(404).json({ error: 'Код не найден или истёк. Получите новый на другом устройстве.' })
  }

  const sourceId = req.userId!
  const targetId = entry.userId

  if (sourceId !== targetId) {
    await prisma.$transaction(async (tx) => {
      await tx.word.updateMany({ where: { ownerId: sourceId }, data: { ownerId: targetId } })
      await tx.chatSession.updateMany({ where: { userId: sourceId }, data: { userId: targetId } })

      const targetSaved = new Set(
        (await tx.savedWord.findMany({ where: { userId: targetId }, select: { wordId: true } })).map((s) => s.wordId),
      )
      for (const s of await tx.savedWord.findMany({ where: { userId: sourceId } })) {
        if (!targetSaved.has(s.wordId)) await tx.savedWord.update({ where: { id: s.id }, data: { userId: targetId } })
      }

      const targetProgress = new Map(
        (await tx.quizProgress.findMany({ where: { userId: targetId } })).map((p) => [`${p.wordId}|${p.quizType}`, p]),
      )
      for (const p of await tx.quizProgress.findMany({ where: { userId: sourceId } })) {
        const existing = targetProgress.get(`${p.wordId}|${p.quizType}`)
        if (!existing) await tx.quizProgress.update({ where: { id: p.id }, data: { userId: targetId } })
        else if (p.attempts > existing.attempts) {
          await tx.quizProgress.delete({ where: { id: existing.id } })
          await tx.quizProgress.update({ where: { id: p.id }, data: { userId: targetId } })
        }
      }

      // остатки (дубликаты) удалятся каскадом вместе с локальным профилем
      await tx.user.delete({ where: { id: sourceId } })
      await tx.transferCode.deleteMany({ where: { code } })
    })
  } else {
    await prisma.transferCode.deleteMany({ where: { code } })
  }

  res.json({ userId: targetId })
})
