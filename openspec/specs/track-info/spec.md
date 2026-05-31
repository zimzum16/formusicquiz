## ADDED Requirements

### Requirement: Агрегация информации о треке
Система SHALL принимать Spotify track ID и возвращать агрегированные данные из всех доступных источников параллельно.

#### Scenario: Полная информация
- **WHEN** клиент запрашивает GET `/api/tracks/:id/info` с валидным Spotify ID
- **THEN** система возвращает объект с секциями `spotify`, `genius`, `lastfm`, `setlistfm`, `youtube`, `yandex`

#### Scenario: Spotify секция
- **WHEN** трек найден в Spotify
- **THEN** секция `spotify` содержит: `title`, `artist`, `album`, `release_date`, `duration_ms`, `preview_url`, `cover_url`, `spotify_url`, `popularity`

#### Scenario: Genius секция
- **WHEN** трек найден на Genius
- **THEN** секция `genius` содержит:
  - `lyrics_url`, `description`
  - `release_date`, `language`, `pageviews`, `song_art_image_url`
  - `media[]` — массив `{type: string, url: string}` (Apple Music, Spotify, YouTube и др.)
  - `writer_artists[]`, `producer_artists[]`, `featured_artists[]` — массивы `{name, url}`
  - `samples[]`, `sampled_in[]`, `interpolates[]`, `interpolated_by[]`, `cover_of[]`, `covered_by[]`, `remix_of[]`, `remixes[]`, `live_version_of[]` — массивы `{title, artist, genius_url}`; пустой массив если нет связей
- **WHEN** трек не найден на Genius
- **THEN** секция `genius` равна `null`

#### Scenario: Last.fm секция
- **WHEN** трек найден на Last.fm
- **THEN** секция `lastfm` содержит: `listeners`, `playcount`, `url`, `tags[]` (первые 5: `{name, url}`), `similar[]` (первые 5: `{title, artist, url}`)
- **WHEN** трек не найден
- **THEN** секция `lastfm` равна `null`

#### Scenario: Setlist.fm секция
- **WHEN** данные об исполнениях найдены
- **THEN** секция `setlistfm` содержит: `total_performances`, `first_performance` (`{date, venue, city, tour}`), `last_performance` (`{date, venue, city, tour}`), `encore_count`
- **WHEN** данных нет
- **THEN** секция `setlistfm` равна `null`

#### Scenario: YouTube секция с статистикой
- **WHEN** `YOUTUBE_API_KEY` задан и клип найден
- **THEN** секция `youtube` содержит `video_id`, `url`, `view_count`, `like_count`
- **WHEN** ключ не задан или клип не найден
- **THEN** секция `youtube` содержит только `search_url` (deeplink), `view_count` и `like_count` равны `null`

#### Scenario: Яндекс Музыка секция — основные данные
- **WHEN** трек найден в Яндекс Музыке по названию и исполнителю
- **THEN** секция `yandex` содержит: `url` (прямая ссылка на трек), `search_url` (deeplink на поиск), `likes_count` (число лайков или `null`)
- **WHEN** трек не найден в Яндекс Музыке
- **THEN** секция `yandex` содержит только `search_url`, поля `url` и `likes_count` равны `null`

#### Scenario: Яндекс Музыка секция — чарт
- **WHEN** трек присутствует в текущем Яндекс Чарте
- **THEN** поле `yandex.chart` содержит `position` (число) и `progress` (`"up"` | `"down"` | `"same"`)
- **WHEN** трек не в чарте
- **THEN** поле `yandex.chart` равно `null`

#### Scenario: Кеш чарта Яндекс Музыки
- **WHEN** система запрашивает Яндекс Чарт
- **THEN** результат кешируется in-memory с TTL 1 час; повторные запросы в течение часа не обращаются к внешнему API

#### Scenario: Apple Music секция — deeplink
- **WHEN** запрос выполняется
- **THEN** секция `apple_music` содержит `search_url` с deeplink на поиск по названию и исполнителю

#### Scenario: Apple Music секция — чарт
- **WHEN** трек найден в iTunes Top-100 Russia (rss.applemarketingtools.com)
- **THEN** поле `apple_music.chart` содержит `position` (число) и `country` (`"ru"`)
- **WHEN** трек не найден в чарте
- **THEN** поле `apple_music.chart` равно `null`

#### Scenario: Кеш чарта Apple Music
- **WHEN** система запрашивает iTunes RSS
- **THEN** результат кешируется in-memory с TTL 1 час

#### Scenario: Параллельные запросы
- **WHEN** система агрегирует данные
- **THEN** запросы к Spotify, Genius, Last.fm, Setlist.fm, YouTube выполняются через `Promise.allSettled` параллельно

#### Scenario: Один источник недоступен
- **WHEN** Genius API недоступен, Spotify отвечает
- **THEN** система возвращает 200 с данными Spotify и `genius: null`

#### Scenario: Невалидный Spotify ID
- **WHEN** Spotify не находит трек по ID
- **THEN** система возвращает 404 с `{"error": "Track not found"}`
