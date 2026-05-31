## 1. Бэкенд — Яндекс Музыка

- [x] 1.1 Обновить `server/lib/yandex.ts`: добавить `getTrackInfo(title, artist)` — поиск трека через неофициальный API, возврат `{ url, likes_count, search_url, chart }`
- [x] 1.2 Добавить in-memory кеш Яндекс Чарта с TTL 1 час

## 2. Бэкенд — Apple Music

- [x] 2.1 Создать `server/lib/applemusic.ts` с `getAppleMusicData(title, artist)` — загрузка iTunes RSS Russia Top-100, матчинг по названию+исполнителю, возврат `{ search_url, chart }`
- [x] 2.2 In-memory кеш iTunes RSS с TTL 1 час

## 3. Бэкенд — роут

- [x] 3.1 Обновить схемы в `server/routes/tracks.ts`: расширить `YandexSchema` до `{ url, search_url, likes_count, chart }`, добавить `AppleMusicSchema`
- [x] 3.2 Добавить `apple_music` в `TrackInfoSchema`
- [x] 3.3 Обновить хендлер `/:id/info` — вызвать `getTrackInfo` и `getAppleMusicData` параллельно через `Promise.allSettled`

## 4. Фронтенд — типы и UI

- [x] 4.1 Обновить `TrackInfo` в `src/lib/api.ts` — новый тип `yandex` и добавить `apple_music`
- [x] 4.2 Обновить секцию Яндекс Музыки в `src/pages/SongInfo.tsx` — показывать `likes_count` и позицию чарта
- [x] 4.3 Добавить секцию Apple Music в `src/pages/SongInfo.tsx` — deeplink и позиция в iTunes чарте
