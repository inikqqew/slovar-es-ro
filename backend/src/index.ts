import 'dotenv/config'
import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { existsSync } from 'node:fs'
import type { NextFunction, Request, Response } from 'express'
import { healthRouter } from './routes/health.js'
import { wordsRouter } from './routes/words.js'
import { dictionaryRouter } from './routes/dictionary.js'
import { quizzesRouter } from './routes/quizzes.js'
import { chatRouter } from './routes/chat.js'
import { ocrRouter } from './routes/ocr.js'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/words', wordsRouter)
app.use('/api/dictionary', dictionaryRouter)
app.use('/api/quizzes', quizzesRouter)
app.use('/api/chat', chatRouter)
app.use('/api/ocr', ocrRouter)

// Локальный/самостоятельный деплой: тот же процесс отдаёт собранный фронтенд.
const frontendDir = process.env.SERVE_FRONTEND_DIR
if (frontendDir && existsSync(frontendDir)) {
  app.use(express.static(frontendDir))
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')))
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled route error:', err)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`)
})
