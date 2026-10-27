# SoundLens — контекст для Claude

## Что это

MVP музыкального сервиса: поиск информации о треках (Spotify + Genius) и аудиоредактор с обрезкой.

## Стек

**Фронтенд:** React 18, TypeScript, Vite 5, Tailwind CSS, Lucide React (иконки — не менять)

**Бэкенд:** Node.js, Hono, better-sqlite3, bcryptjs, jose (JWT)

**База данных:** SQLite — файл `db.sqlite` в корне, не коммитится

**Внешние API** — только через бэкенд, ключи не на фронте:
- Spotify, iTunes, Apple Music (поиск, метаданные, обложки)
- Genius (API + скрейпинг страниц через ScrapingBee/ScraperAPI/scrape.do)
- Last.fm, Setlist.fm, YouTube, Яндекс Музыка, Wikidata/Wikipedia/MusicBrainz

**Деплой:** два варианта, оба поддерживаются — Docker на VPS (`Dockerfile.frontend` + nginx, `server/Dockerfile`) и Vercel (`vercel.json`, `api/index.ts`)

## Команды

```bash
# Фронтенд
npm install && npm run dev        # http://localhost:5173
npm run typecheck && npm run lint
npm test                          # vitest: src/**/*.test.ts и server/**/*.test.ts

# Бэкенд
cd server && npm install && npm run dev   # http://localhost:3001
cd server && npx tsc --noEmit            # проверка типов
```

## Переменные окружения

Фронт читает `VITE_*` через `import.meta.env`. Бэкенд читает из `process.env`.
Шаблон в `.env.example`. Реальный `.env` не коммитится.

```
VITE_API_URL            — URL бэкенда (фронт)
VITE_LANG               — язык интерфейса ru | en (фронт)
PORT                    — порт бэкенда (по умолчанию 3001)
FRONTEND_URL            — для CORS
JWT_SECRET, DB_PATH     — для auth (роуты пока не подключены)
SPOTIFY_CLIENT_ID/SECRET, GENIUS_ACCESS_TOKEN, LASTFM_API_KEY, SETLISTFM_API_KEY,
YOUTUBE_API_KEY, YANDEX_MUSIC_TOKEN, WIKI_USER_AGENT
SCRAPERBEE_KEYS, SCRAPERAPI_KEY(S), SCRAPERDO_KEY(S), SCRAPE_PROXY_URL — скрейпинг Genius
UPSTASH_REDIS_REST_URL/TOKEN — кэш (без них — в памяти)
NTFY_TOPIC              — уведомления о фидбеке
```

## Структура

```
src/
  App.tsx               — роутер на useState<Page>, футер с переключением языка и фидбеком
  i18n/                 — ru/en-строки, язык из VITE_LANG
  hooks/
    useAudioEditor.ts   — состояние редактора: загрузка, сегменты, экспорт
    useInfo.ts          — загрузка инфо об артисте/альбоме
  lib/
    api.ts              — fetch-клиент и типы ответов бэкенда
    audioUtils.ts       — экспорт сегмента: по фреймам (exportMp3Segment) или через PCM (processAudioSegment)
    audioWorker.ts      — Web Worker: кодирование PCM → MP3 (lamejs), битрейт передаётся снаружи
    mp3Container.ts     — разбор MP3-фреймов, битрейт/VBR, нарезка без перекодирования, Xing-заголовок
    id3Parser.ts        — чтение ID3v2 из исходника (читает только тег, не весь файл)
    id3Writer.ts        — запись ID3v2.3 в нарезанные фрагменты + загрузка обложки
    waveform.ts         — пики waveform (computePeaks) и отрисовка на canvas
    songStructure.ts    — разметка куплет/припев/бридж по тексту
  components/           — Navbar, InfoPanel, FeedbackModal, editor/*
  pages/                — Home, SongInfo, Editor, Pricing

server/
  app.ts                — Hono-приложение: роуты, CORS, /api/scrape, /api/img, OpenAPI (/docs)
  index.ts              — точка входа для Node; api/index.ts — для Vercel
  routes/               — tracks, info, feedback; auth.ts (написан, но не смонтирован в app.ts)
  lib/                  — клиенты внешних API, cache.ts (память + Upstash),
                          scrape.ts (fetchGeniusHtml: каскад direct → прокси → скрейперы),
                          text.ts (normKey/namesOverlap — сравнение имён, любой алфавит)
  db.ts, middleware/session.ts — SQLite users/sessions и JWT, нужны только auth
```

## Роутинг

Ручной через `useState<Page>` в `App.tsx` — без React Router (намеренно для MVP).

## Текущий статус MVP

| Фича | Статус |
|---|---|
| UI все страницы | ✅ |
| Auth (register/login/logout/me) | ⏳ код на бэкенде есть, не подключён к app.ts и фронту |
| Обрезка аудио (Web Audio API) | ✅ |
| ID3-теги в нарезанных файлах | ✅ |
| Waveform по пикам, без хранения PCM | ✅ |
| Резка по MP3-фреймам без перекодирования | ✅ |
| Spotify + Genius + прочие источники | ✅ |
| Деплой: Docker/nginx и Vercel | ✅ |

## Важные решения

- Supabase убран в пользу собственного бэкенда на Hono
- Vercel и auth сохраняются намеренно, даже если сейчас не используются
- Обрезка аудио — в браузере через Web Audio API, серверный FFmpeg не нужен
- Резка MP3 — по границам фреймов (~26 мс), без декодирования: битрейт и качество исходника
  сохраняются один в один. При загрузке `scanFrames` строит таблицу фреймов (`mp3Frames` в хуке).
  Для VBR в начало фрагмента пишется новый Xing-заголовок (иначе плееры врут о длительности)
- Fade требует перекодирования: декодируется только кусок фрагмента (+1 фрейм до начала из-за
  bit reservoir) через `OfflineAudioContext` с частотой исходника, кодируется lamejs с битрейтом,
  ближайшим к исходному. Если фреймы не распознались — fallback: полное декодирование, 128 kbps
- Декодированный `AudioBuffer` не хранится в стейте: при загрузке из него считаются пики
  (8000 значений) и он отпускается.
  Декодирование вынесено в `decodeFile`/`decodePeaks`, чтобы буфер не попадал в замыкания
- В нарезанные файлы пишется новый ID3v2.3 (UTF-16) из подтверждённых данных `audioFile`
  (после очистки от `[muzmo.ru]` и обогащения Spotify/iTunes), а не копия исходного тега.
  Обложка скачивается по URL; если CORS/сеть не пускает — файл сохраняется без обложки
- `lastInsertRowid` оборачивается в `Number()` из-за типа `number | bigint` в better-sqlite3
- `/logout` защищён `requireAuth` — нельзя удалить чужую сессию
- INSERT в register обёрнут в try-catch на `SQLITE_CONSTRAINT_UNIQUE` (race condition)
