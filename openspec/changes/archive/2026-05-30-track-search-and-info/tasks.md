## 1. Бэкенд — Spotify клиент

- [x] 1.1 Создать `server/lib/spotify.ts` с получением app token через `client_credentials` и кэшированием в памяти
- [x] 1.2 Реализовать функцию `searchTracks(query, artist?)` — запрос к Spotify Search API, возврат до 10 треков
- [x] 1.3 Реализовать функцию `getTrack(id)` — получение полных метаданных трека по Spotify ID

## 2. Бэкенд — Genius клиент

- [x] 2.1 Создать `server/lib/genius.ts` с функцией `searchSong(title, artist)`:
  - Поиск через `GET /search`, берём первый результат, затем `GET /songs/:id?text_format=plain`
  - **Метаданные:** `lyrics_url`, `description`, `release_date`, `language`, `pageviews`, `song_art_image_url`, `media[]` (тип + url)
  - **Кредиты:** `writer_artists[]`, `producer_artists[]`, `featured_artists[]` (имя + url профиля)
  - **Связи:** `samples[]`, `sampled_in[]`, `interpolates[]`, `interpolated_by[]`, `cover_of[]`, `covered_by[]`, `remix_of[]`, `remixes[]`, `live_version_of[]` — каждая: `{title, artist, genius_url}`; пустой массив если нет

## 3. Бэкенд — Last.fm клиент

- [x] 3.1 Создать `server/lib/lastfm.ts` с функцией `getTrackInfo(title, artist)`:
  - Запрос `track.getInfo` к Last.fm API
  - Возврат: `listeners`, `playcount`, `url`, `tags[]` (первые 5: `{name, url}`), `similar[]` (первые 5: `{title, artist, url}`)
  - Если трек не найден — возвращает `null`

## 4. Бэкенд — Setlist.fm клиент

- [x] 4.1 Создать `server/lib/setlistfm.ts` с функцией `getTrackStats(title, artist)`:
  - Поиск артиста через `search/artists`, получение MBID
  - Перебор сетлистов через `artist/:mbid/setlists` для подсчёта исполнений трека
  - Возврат: `total_performances`, `first_performance` (`{date, venue, city, tour}`), `last_performance` (`{date, venue, city, tour}`), `encore_count`
  - Если данных нет — возвращает `null`

## 5. Бэкенд — YouTube и Яндекс

- [x] 5.1 Создать `server/lib/youtube.ts` с функцией `findVideo(title, artist)` — если `YOUTUBE_API_KEY` задан, ищет через YouTube Data API v3 (parts: `snippet,statistics`) и возвращает `video_id`, `url`, `view_count`, `like_count`; иначе возвращает только `search_url` с `null` для счётчиков
- [x] 5.2 Создать `server/lib/yandex.ts` с функцией `getSearchUrl(title, artist)` — генерирует deeplink на Яндекс Музыку

## 6. Бэкенд — API роуты

- [x] 6.1 Создать `server/routes/tracks.ts` с роутом `GET /search` (zod-openapi) — валидация query params, вызов spotify.searchTracks, возврат типизированного массива
- [x] 6.2 Добавить роут `GET /:id/info` — параллельный вызов через `Promise.allSettled` к spotify.getTrack, genius.searchSong, lastfm.getTrackInfo, setlistfm.getTrackStats, youtube.findVideo, yandex.getSearchUrl
- [x] 6.3 Подключить `tracksRouter` в `server/index.ts` по пути `/api/tracks`

## 7. Типы и OpenAPI

- [x] 7.1 Убедиться что zod-схемы роутов полностью описывают ответы (включая nullable поля для Genius/Last.fm/Setlist.fm/YouTube)
- [x] 7.2 Регенерировать `src/lib/api-types.ts` командой `npm run gen:types`

## 8. Фронтенд — поиск

- [x] 8.1 Добавить в `src/lib/api.ts` методы `tracksApi.search(q, artist?)` и `tracksApi.getInfo(id)`
- [x] 8.2 Переработать `src/pages/SongInfo.tsx`: форма поиска с полями «Название» и «Исполнитель», кнопка поиска
- [x] 8.3 Отображать список результатов поиска — карточки с обложкой, названием, исполнителем, длительностью

## 9. Фронтенд — страница трека

- [x] 9.1 По клику на результат запрашивать `/api/tracks/:id/info` и показывать состояние загрузки
- [x] 9.2 Отобразить секцию Spotify: обложка, название, исполнитель, альбом, дата выхода, превью-плеер
- [x] 9.3 Отобразить секцию Genius (если `genius !== null`):
  - Авторы (`writer_artists`), продюсеры (`producer_artists`), фиче-артисты (`featured_artists`)
  - Дата выхода, язык, популярность (`pageviews`), обложка Genius (`song_art_image_url`)
  - Ссылки из `media[]` (Apple Music, YouTube и др.)
  - Связи трека: блоки «Сэмплирует», «Сэмплировали», «Каверы», «Ремиксы», «Интерполяции» — только непустые
- [x] 9.4 Отобразить секцию Last.fm (если `lastfm !== null`): слушатели, прослушивания, теги, похожие треки
- [x] 9.5 Отобразить секцию Setlist.fm (если `setlistfm !== null`): всего исполнений, первое/последнее (дата, площадка, тур), процент encore
- [x] 9.6 Отобразить секцию YouTube: ссылка на клип, счётчики просмотров и лайков (если `view_count !== null`)
- [x] 9.7 Скрывать секции с `null`-данными без ошибок, показывать сообщение об ошибке при сбое запроса
