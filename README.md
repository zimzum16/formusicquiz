# SoundLens

Веб-приложение для поиска информации о музыке и обрезки аудио.

**Функции:**
- Поиск трека — метаданные через Spotify API, текст через Genius API
- Аудиоредактор — загрузка MP3, выбор фрагментов, fade in/out, скачивание результата
- Авторизация — бэкенд-роуты register/login/logout/me написаны, но пока не подключены в `server/app.ts` и не используются фронтом

## Стек

| Слой | Технологии |
|---|---|
| Фронтенд | React 18, TypeScript, Vite 5, Tailwind CSS |
| Бэкенд | Node.js, Hono, better-sqlite3 |
| База данных | SQLite (`db.sqlite`) |
| Внешние API | Spotify API, Genius API |
| Деплой | Docker (VPS) + nginx или Vercel (serverless) |

## Быстрый старт

```bash
# 1. Установить зависимости
npm install
cd server && npm install && cd ..

# 2. Настроить переменные окружения
cp .env.example .env
# Заполнить значения (см. раздел ниже)

# 3. Запустить бэкенд (терминал 1)
cd server && npm run dev

# 4. Запустить фронтенд (терминал 2)
npm run dev
# → http://localhost:5173
```

## Команды

**Фронтенд:**

| Команда | Описание |
|---|---|
| `npm run dev` | Dev-сервер с hot reload |
| `npm run build` | Production-сборка в `dist/` |
| `npm run preview` | Предпросмотр production-сборки |
| `npm run lint` | ESLint |
| `npm run typecheck` | Проверка типов TypeScript |

**Бэкенд (`cd server`):**

| Команда | Описание |
|---|---|
| `npm run dev` | Dev-сервер (tsx watch) на порту 3001 |
| `npm run build` | Компиляция в `server/dist/` |
| `npm start` | Запуск скомпилированного бэкенда |

## Переменные окружения

Все переменные описаны в `.env.example`. Ключевые:

| Переменная | Где | Описание |
|---|---|---|
| `VITE_API_URL` | `.env` (фронт) | URL бэкенда |
| `VITE_LANG` | `.env` (фронт) | Язык интерфейса: `ru` / `en` |
| `SPOTIFY_CLIENT_ID` / `SECRET` | `.env` (бэкенд) | Spotify API |
| `GENIUS_ACCESS_TOKEN` | `.env` (бэкенд) | Genius API |
| `JWT_SECRET` | `.env` (бэкенд) | Секрет для JWT (auth) — менять в продакшне |

Остальные ключи (Last.fm, Setlist.fm, YouTube, Яндекс Музыка, скрейперы, Upstash, ntfy) — в `.env.example`.

## Структура проекта

```
├── src/                  Фронтенд (React)
│   ├── components/       Navbar, InfoPanel, FeedbackModal, editor/ (waveform, trim, fade, структура песни)
│   ├── hooks/            useAudioEditor.ts, useInfo.ts
│   ├── i18n/             ru/en-строки, язык из VITE_LANG
│   ├── lib/              api.ts, аудио (mp3Container, id3*, waveform, audioWorker), songStructure, imageSearch
│   └── pages/            Home, SongInfo, Editor, Pricing
├── server/               Бэкенд (Hono)
│   ├── app.ts            Hono-приложение: роуты, CORS, /api/scrape, /api/img, OpenAPI
│   ├── index.ts          Точка входа для Node (VPS/Docker)
│   ├── routes/           tracks, info, feedback; auth (не подключён)
│   ├── lib/              клиенты Spotify, Genius, iTunes, Last.fm, Setlist.fm, YouTube, Яндекс, Apple Music, Wiki; cache
│   ├── middleware/       session.ts (JWT, для auth)
│   └── db.ts             SQLite-схема users/sessions (для auth)
├── api/index.ts          Точка входа для Vercel
├── .env.example          Шаблон переменных окружения
└── db.sqlite             База данных (не коммитится)
```

## Деплой

**Docker (VPS):** `Dockerfile.frontend` собирает фронт и отдаёт его через nginx (`nginx.conf`, `/api/*` проксируется на `api.trackslice.ru`); `server/Dockerfile` собирает бэкенд (SQLite в `/data/db.sqlite`).

**Vercel:** `vercel.json` + `api/index.ts` — бэкенд как serverless-функция. Genius блокирует IP Vercel, поэтому скрейпинг идёт через `SCRAPE_PROXY_URL` (VPS-эндпоинт `/api/scrape`), кэш — Upstash Redis.

## Безопасность

- `.env` и `db.sqlite` не коммитятся (прописано в `.gitignore`)
- API-ключи Spotify и Genius хранятся только на сервере, фронт их не видит
- Auth (когда будет подключён): пароли через bcrypt, сессии в SQLite, JWT подписан `JWT_SECRET`
