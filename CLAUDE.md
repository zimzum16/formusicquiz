# SoundLens — контекст для Claude

## Что это

MVP музыкального сервиса: поиск информации о треках (Spotify + Genius) и аудиоредактор с обрезкой.

## Стек

**Фронтенд:** React 18, TypeScript, Vite 5, Tailwind CSS, Lucide React (иконки — не менять)

**Бэкенд:** Node.js, Hono, better-sqlite3, bcryptjs, jose (JWT)

**База данных:** SQLite — файл `db.sqlite` в корне, не коммитится

**Внешние API** — только через бэкенд, ключи не на фронте:
- Spotify API (поиск, метаданные, обложки)
- Genius API (текст, авторы)

**Деплой:** собственный VPS, nginx, pm2

## Команды

```bash
# Фронтенд
npm install && npm run dev        # http://localhost:5173
npm run typecheck && npm run lint

# Бэкенд
cd server && npm install && npm run dev   # http://localhost:3001
cd server && npx tsc --noEmit            # проверка типов
```

## Переменные окружения

Фронт читает `VITE_*` через `import.meta.env`. Бэкенд читает из `process.env`.
Шаблон в `.env.example`. Реальный `.env` не коммитится.

```
VITE_API_URL            — URL бэкенда (фронт)
PORT                    — порт бэкенда (по умолчанию 3001)
FRONTEND_URL            — для CORS (по умолчанию http://localhost:5173)
JWT_SECRET              — менять в продакшне
SPOTIFY_CLIENT_ID/SECRET
GENIUS_ACCESS_TOKEN
```

## Структура

```
src/
  App.tsx               — роутер на useState<Page>, восстановление сессии при mount
  lib/
    api.ts              — fetch-клиент, авто-подстановка JWT из localStorage
    audioMetadata.ts    — извлечение длительности через Web Audio API
  pages/
    Auth.tsx            — вход/регистрация → POST /api/auth/login|register
    Profile.tsx         — показывает реальный email из authUser
    Editor.tsx          — загрузка MP3, сегменты, fade (Supabase убрать в Этапе 2)
    SongInfo.tsx        — поиск трека (mock, подключить API в Этапе 3)
    Home.tsx, Pricing.tsx

server/
  index.ts              — Hono, CORS, логгер, порт
  db.ts                 — SQLite, таблицы users + sessions
  routes/auth.ts        — /register, /login, /logout (requireAuth), /me
  middleware/session.ts — JWT-верификация + проверка сессии в БД
```

## Роутинг

Ручной через `useState<Page>` в `App.tsx` — без React Router (намеренно для MVP).

## Текущий статус MVP

| Фича | Статус |
|---|---|
| UI все страницы | ✅ |
| Auth (register/login/logout/me) | ✅ |
| Восстановление сессии при перезагрузке | ✅ |
| Supabase убрать из Editor | ⏳ Этап 2 |
| Обрезка аудио (Web Audio API) | ⏳ Этап 2 |
| Spotify + Genius API | ⏳ Этап 3 |
| nginx.conf + pm2 | ⏳ Этап 4 |

## Важные решения

- Supabase был убран в пользу собственного бэкенда на Hono + SQLite
- Обрезка аудио — в браузере через Web Audio API, серверный FFmpeg не нужен
- `lastInsertRowid` оборачивается в `Number()` из-за типа `number | bigint` в better-sqlite3
- `/logout` защищён `requireAuth` — нельзя удалить чужую сессию
- INSERT в register обёрнут в try-catch на `SQLITE_CONSTRAINT_UNIQUE` (race condition)
