# Словарь ES ↔ RO

Испанско-румынский словарь: перевод, распознавание слов по фото (OCR), интерактивные квизы и AI-чат-бот для практики языка.

ТЗ: [TZ_slovar_ES_RO.md](./TZ_slovar_ES_RO.md)

**Живая версия:** https://inikqqew.github.io/slovar-es-ro/ (фронтенд на GitHub Pages)

## Структура

- `frontend/` — React + Vite + TypeScript + Tailwind CSS, PWA (mobile-first).
- `backend/` — Node.js + Express + TypeScript, Prisma (PostgreSQL/Neon).

## Разработка

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Откроется на `http://localhost:5173`, запросы на `/api/*` проксируются на backend (порт 4000).

### Backend

```bash
cd backend
npm install
cp .env.example .env   # вставить строку подключения Neon в DATABASE_URL
npx prisma db push     # синхронизировать схему с базой (без истории миграций)
npm run dev
```

Health-check: `http://localhost:4000/api/health`.

Перевод слов работает из коробки (MyMemory API, без ключа). Без `ANTHROPIC_API_KEY` в `.env`
значение/AI-верификация и чат-бот будут отвечать, что функция недоступна — добавьте ключ с
[console.anthropic.com](https://console.anthropic.com), чтобы включить это.

База данных — Postgres на [Neon](https://neon.tech) (бесплатный тир, без карты). Приложение и так
требует интернет-соединение (см. ТЗ 4.4/5.3), поэтому локальная разработка и прод используют одну
и ту же облачную базу.

## Деплой

- **Frontend** — автоматически на GitHub Pages при пуше в `main` (workflow `deploy-pages.yml`).
- **Backend** — Render, через `render.yaml` (Blueprint): в дашборде Render выбрать
  "New +" → "Blueprint", подключить этот репозиторий, задать секреты `DATABASE_URL`
  (строка из Neon) и `ANTHROPIC_API_KEY`. Первый запрос после простоя может занимать
  до 50 сек — бесплатный тир Render "засыпает" при неактивности.
- После деплоя backend URL зашить в GitHub → Settings → Secrets and variables → Actions →
  Variables → `VITE_API_BASE_URL` (см. `deploy-pages.yml`), затем перезапустить workflow.

## Roadmap (этапы MVP)

См. раздел 9 ТЗ. Прогресс отмечается в этом README по мере разработки.

- [x] Этап 1 — Каркас: репозиторий, роутинг, светлая/тёмная тема, health-check
- [x] Этап 2 — Поиск и перевод слова: MyMemory (перевод), Claude Haiku (AI-верификация + значение на румынском), кэш в БД
- [x] Этап 3 — Распознавание по фото (OCR): Tesseract.js (офлайн, в браузере), выбор слова из фото → перевод
- [x] Этап 4 — Личный словарь: анонимный профиль (localStorage id), CRUD своих слов + сохранение/убрать из общего кэша, фильтр по языку, поиск
- [x] Этап 5 — Квизы: все 5 форматов (вставь слово / подбери перевод / флеш-карты / сопоставление / правописание), прогресс и упрощённое интервальное повторение
- [x] Этап 6 — Чат-бот: диалог на ES/RO через Claude, мягкие исправления ошибок, требует `ANTHROPIC_API_KEY`
- [ ] Этап 7 — Полировка и деплой (backend live, финальная адаптивность, тест на реальных устройствах)
