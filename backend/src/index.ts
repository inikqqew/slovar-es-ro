import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { healthRouter } from './routes/health.js'
import { wordsRouter } from './routes/words.js'
import { dictionaryRouter } from './routes/dictionary.js'
import { quizzesRouter } from './routes/quizzes.js'
import { chatRouter } from './routes/chat.js'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/words', wordsRouter)
app.use('/api/dictionary', dictionaryRouter)
app.use('/api/quizzes', quizzesRouter)
app.use('/api/chat', chatRouter)

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`)
})
