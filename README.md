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
cp .env.example .env   # заполнить DATABASE_URL и ключи API
npm run dev
```

Health-check: `http://localhost:4000/api/health`.

## Roadmap (этапы MVP)

См. раздел 9 ТЗ. Прогресс отмечается в этом README по мере разработки.

- [x] Этап 1 — Каркас: репозиторий, роутинг, светлая/тёмная тема, health-check
- [ ] Этап 2 — Поиск и перевод слова
- [ ] Этап 3 — Распознавание по фото (OCR)
- [ ] Этап 4 — Личный словарь (CRUD)
- [ ] Этап 5 — Квизы
- [ ] Этап 6 — Чат-бот
- [ ] Этап 7 — Полировка и деплой
