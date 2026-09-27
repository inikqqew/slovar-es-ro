import type { Request, Response, NextFunction } from 'express'
import { prisma } from './prisma.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

// Анонимный профиль (ТЗ 5.4): клиент генерирует свой id (localStorage) и шлёт его
// в заголовке — без пароля/аккаунта. Привязка к email/OAuth может быть добавлена позже
// поверх той же таблицы User, не меняя эту схему.
const ID_HEADER = 'x-user-id'
const ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/

export async function requireAnonUser(req: Request, res: Response, next: NextFunction) {
  const id = req.header(ID_HEADER)
  if (!id || !ID_PATTERN.test(id)) {
    return res.status(400).json({ error: `Заголовок ${ID_HEADER} обязателен` })
  }
  await prisma.user.upsert({ where: { id }, create: { id }, update: {} })
  req.userId = id
  next()
}

// Тот же id, но не обязателен — используется там, где ответ отличается для
// владельца (например, отметка «уже сохранено»), но работает и анонимно без него.
export async function optionalAnonUser(req: Request, _res: Response, next: NextFunction) {
  const id = req.header(ID_HEADER)
  if (id && ID_PATTERN.test(id)) {
    await prisma.user.upsert({ where: { id }, create: { id }, update: {} })
    req.userId = id
  }
  next()
}
