// Локальный «боевой» запуск: встроенный Postgres + миграция схемы + сервер,
// который отдаёт и API, и собранный фронтенд (один порт, доступен с телефона по Wi-Fi).
import EmbeddedPostgres from 'embedded-postgres'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, '.pgdata')
const PG_PORT = 5433
const DB_NAME = 'slovar'

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: PG_PORT,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
  onError: (e) => console.error('[postgres]', e),
})

const fresh = !existsSync(path.join(dataDir, 'PG_VERSION'))
if (fresh) await pg.initialise()
await pg.start()
if (fresh) await pg.createDatabase(DB_NAME)

process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB_NAME}`
process.env.SERVE_FRONTEND_DIR = path.resolve(root, '../frontend/dist')

console.log('Синхронизация схемы БД…')
execSync('npx prisma db push --skip-generate', { cwd: root, stdio: 'inherit', env: process.env })

const stop = async () => {
  await pg.stop().catch(() => {})
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

await import(pathToFileURL(path.join(root, 'dist/index.js')).href)
