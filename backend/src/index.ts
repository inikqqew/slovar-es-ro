import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { healthRouter } from './routes/health.js'
import { wordsRouter } from './routes/words.js'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/words', wordsRouter)

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`)
})
