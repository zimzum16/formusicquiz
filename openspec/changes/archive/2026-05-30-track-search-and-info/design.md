## Context

Стек: Hono + zod-openapi на бэкенде, React 18 + TypeScript на фронте. Spotify и Genius уже сконфигурированы в `.env`. Бэкенд — единственная точка обращения к внешним API (ключи не на фронте). Яндекс Музыка и YouTube не требуют обязательной авторизации для базовых ссылок.

## Goals / Non-Goals

**Goals:**
- Поиск треков через Spotify API, возврат до 10 вариантов
- Агрегация данных о треке из Spotify + Genius + YouTube ссылка + Яндекс Музыка ссылка
- Типобезопасный API через zod-openapi, типы автогенерируются в `api-types.ts`
- Graceful degradation: если один из источников недоступен — остальные всё равно возвращаются

**Non-Goals:**
- Кэширование результатов в БД (Этап 4)
- Стриминг аудио через YouTube/Яндекс
- Аутентификация для поиска (поиск доступен без логина)
- Полный текст с Яндекс Музыки (только deeplink)

## Decisions

### 1. Один агрегирующий эндпоинт вместо нескольких

`GET /api/tracks/:id/info` делает параллельные запросы к Spotify, Genius, YouTube, Яндекс и возвращает единый объект.

Альтернатива — отдельные эндпоинты на каждый сервис — требует N round-trips с фронта и усложняет UI.

### 2. Genius — поиск по названию+исполнителю, не по Spotify ID

Genius не имеет прямой связи со Spotify ID. Ищем по `artist + title`, берём первый результат. Принято как достаточное для MVP.

Из ответа `GET /songs/:id?text_format=plain` извлекаем:
- **Метаданные:** `release_date`, `language`, `pageviews`, `description`, `song_art_image_url`, `media[]` (ссылки на Apple Music, Spotify, YouTube от Genius)
- **Кредиты:** `writer_artists[]`, `producer_artists[]`, `featured_artists[]`
- **Связи:** `samples[]`, `sampled_in[]`, `interpolates[]`, `interpolated_by[]`, `cover_of[]`, `covered_by[]`, `remix_of[]`, `remixes[]`, `live_version_of[]`

Все поля связей — массивы объектов `{title, artist, url}`, могут быть пустыми.

### 3. Last.fm — поиск по названию+исполнителю

Last.fm не имеет прямой связи со Spotify ID. Ищем через `track.getInfo?artist=...&track=...`.

Из ответа извлекаем:
- **Популярность:** `listeners`, `playcount`
- **Теги/жанры:** `toptags[]` — массив `{name, url}`, берём первые 5
- **Похожие треки:** `similar[]` — массив `{title, artist, url}`, берём первые 5
- **Ссылка:** `url` на страницу трека на Last.fm

Требует `LASTFM_API_KEY` (бесплатный, регистрация на last.fm/api).

### 4. Setlist.fm — история живых исполнений

Поиск через `GET /rest/1.0/search/setlists?artistName=...&songName=...` или сначала `GET /rest/1.0/search/artists` для получения MBID артиста, затем `GET /rest/1.0/artist/:mbid/setlists`.

Из ответа извлекаем:
- **Статистика:** общее количество живых исполнений трека
- **Первое исполнение:** дата, площадка, город, тур
- **Последнее исполнение:** дата, площадка, город, тур
- **Encore:** был ли трек в encore (vs основной сет)

Требует `SETLISTFM_API_KEY` (бесплатный, регистрация на setlistfm.com/api).

### 5. YouTube и Яндекс — deeplink без API

YouTube: `https://www.youtube.com/results?search_query=artist+title` — публичный URL без ключа.
Яндекс Музыка: `https://music.yandex.ru/search?text=artist+title` — аналогично.
YouTube Data API v3 опционально (если `YOUTUBE_API_KEY` задан — ищем реальный клип, иначе deeplink).

### 6. Структура бэкенда

Новый файл `server/routes/tracks.ts`, подключается в `index.ts` как `/api/tracks`. Spotify-клиент выносится в `server/lib/spotify.ts` (получение app token через client_credentials).

## Risks / Trade-offs

- **Spotify rate limit** → запросы идут через бэкенд с одним app token, лимит выше чем у user token. Риск низкий для MVP.
- **Genius поиск нестабилен** → если первый результат не совпадает — текст будет от другой песни. Митигация: показываем источник и ссылку на Genius для проверки.
- **Яндекс блокировка deeplink** → deeplink может не открываться в регионах без Яндекс Музыки. Митигация: показываем как необязательный источник.
- **Холодный старт Spotify token** → app token кэшируем в памяти до истечения срока (expires_in). Без персистентности — при рестарте сервера один лишний запрос.
