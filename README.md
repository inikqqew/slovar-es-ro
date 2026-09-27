# Словарь ES ↔ RO

Испанско-румынский словарь: перевод, распознавание слов по фото (OCR), интерактивные квизы и AI-чат-бот для практики языка.

ТЗ: [TZ_slovar_ES_RO.md](./TZ_slovar_ES_RO.md)

## Структура

- `frontend/` — React + Vite + TypeScript + Tailwind CSS, PWA (mobile-first).
- `backend/` — Node.js + Express + TypeScript, Prisma (PostgreSQL).

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
cp .env.example .env        # локально можно оставить как есть (SQLite, без ключей)
npx prisma migrate deploy   # создать/обновить локальную SQLite БД
npm run dev
```

Health-check: `http://localhost:4000/api/health`.

Перевод слов работает из коробки (MyMemory API, без ключа). Без `ANTHROPIC_API_KEY` в `.env`
значение и AI-верификация будут помечаться как «недоступны» — добавьте ключ с
[console.anthropic.com](https://console.anthropic.com), чтобы включить это.

## Roadmap (этапы MVP)

См. раздел 9 ТЗ. Прогресс отмечается в этом README по мере разработки.

- [x] Этап 1 — Каркас: репозиторий, роутинг, светлая/тёмная тема, health-check
- [x] Этап 2 — Поиск и перевод слова: MyMemory (перевод), Claude Haiku (AI-верификация + значение на румынском), SQLite-кэш
- [x] Этап 3 — Распознавание по фото (OCR): Tesseract.js (офлайн, в браузере), выбор слова из фото → перевод
- [x] Этап 4 — Личный словарь: анонимный профиль (localStorage id), CRUD своих слов + сохранение/убрать из общего кэша, фильтр по языку, поиск
- [x] Этап 5 — Квизы: все 5 форматов (вставь слово / подбери перевод / флеш-карты / сопоставление / правописание), прогресс и упрощённое интервальное повторение
- [ ] Этап 6 — Чат-бот
- [ ] Этап 7 — Полировка и деплой
