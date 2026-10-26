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
  hooks/
    useAudioEditor.ts   — состояние редактора: загрузка, сегменты, экспорт
  lib/
    api.ts              — fetch-клиент, авто-подстановка JWT из localStorage
    audioUtils.ts       — экспорт сегмента: по фреймам (exportMp3Segment) или через PCM (processAudioSegment)
    audioWorker.ts      — Web Worker: кодирование PCM → MP3 (lamejs), битрейт передаётся снаружи
    mp3Container.ts     — разбор MP3-фреймов, битрейт/VBR, нарезка без перекодирования, Xing-заголовок
    id3Parser.ts        — чтение ID3v2 из исходника (читает только тег, не весь файл)
    id3Writer.ts        — запись ID3v2.3 в нарезанные фрагменты + загрузка обложки
    waveform.ts         — пики waveform (computePeaks) и отрисовка на canvas
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
| Обрезка аудио (Web Audio API) | ✅ |
| ID3-теги в нарезанных файлах | ✅ |
| Waveform по пикам, без хранения PCM | ✅ |
| Резка по MP3-фреймам без перекодирования | ✅ |
| Spotify + Genius API | ⏳ Этап 3 |
| nginx.conf + pm2 | ⏳ Этап 4 |

## Важные решения

- Supabase был убран в пользу собственного бэкенда на Hono + SQLite
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
