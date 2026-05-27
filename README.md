# SoundLens

Веб-приложение для поиска информации о музыке и обрезки аудио.

**Функции:**
- Поиск трека — метаданные через Spotify API, текст через Genius API
- Аудиоредактор — загрузка MP3, выбор фрагментов, fade in/out, скачивание результата
- Авторизация — регистрация и вход через собственный бэкенд

## Стек

| Слой | Технологии |
|---|---|
| Фронтенд | React 18, TypeScript, Vite 5, Tailwind CSS |
| Бэкенд | Node.js, Hono, better-sqlite3 |
| База данных | SQLite (`db.sqlite`) |
| Внешние API | Spotify API, Genius API |
| Деплой | VPS, nginx, pm2 |

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
| `JWT_SECRET` | `.env` (бэкенд) | Секрет для JWT — менять в продакшне |
| `SPOTIFY_CLIENT_ID` | `.env` (бэкенд) | Spotify API |
| `SPOTIFY_CLIENT_SECRET` | `.env` (бэкенд) | Spotify API |
| `GENIUS_ACCESS_TOKEN` | `.env` (бэкенд) | Genius API |

## Структура проекта

```
├── src/                  Фронтенд (React)
│   ├── components/       Navbar
│   ├── lib/              api.ts, audioMetadata.ts
│   └── pages/            Home, SongInfo, Editor, Pricing, Auth, Profile
├── server/               Бэкенд (Hono)
│   ├── routes/           auth.ts
│   ├── middleware/        session.ts
│   ├── db.ts             SQLite-схема
│   └── index.ts          Точка входа
├── .env.example          Шаблон переменных окружения
└── db.sqlite             База данных (не коммитится)
```

## Деплой на VPS

```bash
# Собрать фронтенд
npm run build            # → dist/

# Собрать бэкенд
cd server && npm run build   # → server/dist/

# Запустить бэкенд через pm2
pm2 start server/dist/index.js --name soundlens-api

# nginx: / → dist/, /api/* → localhost:3001
```

Пример конфига nginx — см. `nginx.conf.example` (появится в Этапе 4).

## Безопасность

- `.env` и `db.sqlite` не коммитятся (прописано в `.gitignore`)
- API-ключи Spotify и Genius хранятся только на сервере, фронт их не видит
- Пароли хэшируются через bcrypt
- Сессии хранятся в SQLite, JWT подписан `JWT_SECRET`
