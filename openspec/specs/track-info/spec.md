## MODIFIED Requirements

### Requirement: Агрегация информации о треке
Система SHALL принимать Spotify track ID и возвращать агрегированные данные из всех доступных источников параллельно, кроме Setlist.fm который возвращается отдельным эндпоинтом.

#### Scenario: Основная информация — быстрый ответ
- **WHEN** клиент запрашивает GET `/api/tracks/:id/info`
- **THEN** система возвращает объект с секциями `spotify`, `genius`, `lastfm`, `youtube`, `yandex`, `apple_music` за ~1–2 секунды

#### Scenario: Setlist.fm — отдельный эндпоинт
- **WHEN** клиент запрашивает GET `/api/tracks/:id/setlistfm`
- **THEN** система возвращает объект `SetlistStats` или `null`; запрос выполняется параллельно с `/info` на клиенте

#### Scenario: Кеш результатов
- **WHEN** клиент повторно запрашивает `/info` или `/setlistfm` для того же track ID
- **THEN** система возвращает кешированный ответ без обращения к внешним API; TTL 1 час

#### Scenario: Невалидный Spotify ID
- **WHEN** Spotify не находит трек по ID
- **THEN** система возвращает 404 с `{"error": "Track not found"}`

#### Scenario: Один источник недоступен
- **WHEN** один из источников (Genius, Last.fm и т.д.) возвращает ошибку
- **THEN** система возвращает 200 с данными остальных источников и `null` для недоступного

---

### Requirement: Очистка названия трека
Перед поиском в сторонних источниках система SHALL удалять Spotify-суффиксы из названия трека.

#### Scenario: Ремастеры и версии
- **WHEN** название содержит суффиксы вида `- Remastered 2012`, `- 2009 Remaster`, `(Radio Edit)`, `(Live)`, `(Acoustic)` и подобные
- **THEN** суффикс удаляется и поиск в Genius/Last.fm/Setlist.fm идёт по чистому названию

---

### Requirement: Genius секция
Секция `genius` SHALL содержать расширенные метаданные из Genius API.

#### Scenario: Полные данные
- **WHEN** трек найден на Genius
- **THEN** секция содержит:
  - `lyrics_url`, `description`, `language`, `pageviews`, `song_art_image_url`
  - `release_date` (полная дата YYYY-MM-DD или null)
  - `release_year` (число из `release_date_components.year` или null — используется когда полная дата недоступна)
  - `media[]` — массив `{type, url}`
  - `writer_artists[]`, `producer_artists[]`, `featured_artists[]` — массивы `{name, url}`
  - `samples[]`, `sampled_in[]`, `interpolates[]`, `interpolated_by[]`, `cover_of[]`, `covered_by[]`, `remix_of[]`, `remixes[]`, `live_version_of[]`

#### Scenario: Трек не найден
- **WHEN** Genius не находит трек
- **THEN** секция `genius` равна `null`

---

### Requirement: Setlist.fm секция
Система SHALL возвращать данные о живых выступлениях через отдельный GET `/api/tracks/:id/setlistfm`.

#### Scenario: Полный счёт исполнений
- **WHEN** данные найдены
- **THEN** `total_performances` содержит точное количество, полученное обходом всех страниц Setlist.fm API батчами по 15

#### Scenario: Содержимое ответа
- **WHEN** данные найдены
- **THEN** ответ содержит:
  - `total_performances` — точное число исполнений
  - `url` — ссылка на страницу статистики `setlist.fm/stats/songs/{mbid}.html?songName=...`
  - `first_performance` — `{date, venue, city, tour}` — реальное первое исполнение (из последней страницы API)
  - `last_performance` — `{date, venue, city, tour}` — последнее исполнение

#### Scenario: Кеш MBID исполнителя
- **WHEN** система ищет MBID исполнителя на Setlist.fm
- **THEN** результат кешируется in-memory с TTL 24 часа

#### Scenario: Данных нет
- **WHEN** исполнитель не найден на Setlist.fm или трек никогда не исполнялся
- **THEN** ответ равен `null`

---

### Requirement: Apple Music секция — мультичарт
Система SHALL проверять наличие трека в чартах Top-100 по 10 странам параллельно.

#### Scenario: Позиции в чартах
- **WHEN** трек найден в одном или нескольких чартах
- **THEN** поле `apple_music.charts` содержит массив `{position, country}` для каждой страны где трек присутствует, отсортированный по позиции

#### Scenario: Страны чартов
- **WHEN** система проверяет чарты
- **THEN** проверяются страны: `ru`, `us`, `gb`, `de`, `fr`, `au`, `mx`, `se`, `jp`, `kr`

#### Scenario: Трек не в чартах
- **WHEN** трек не найден ни в одном чарте
- **THEN** поле `apple_music.charts` равно `[]`

#### Scenario: Прогрев кеша при старте
- **WHEN** сервер запускается
- **THEN** все 10 чартов загружаются в фоне немедленно, чтобы первый пользовательский запрос не ждал холодную загрузку

#### Scenario: Timeout
- **WHEN** запрос Apple Music занимает более 3 секунд
- **THEN** `/info` возвращает `apple_music` с пустым `charts: []` не дожидаясь ответа

#### Scenario: Матчинг
- **WHEN** название или исполнитель содержат только кириллицу (нормализуются в пустую строку)
- **THEN** совпадение не засчитывается во избежание ложных срабатываний

#### Scenario: Кеш чарта
- **WHEN** чарт загружен
- **THEN** кешируется per-country in-memory с TTL 1 час

---

### Requirement: Last.fm секция
#### Scenario: Данные найдены
- **WHEN** трек найден на Last.fm
- **THEN** секция `lastfm` содержит: `listeners`, `playcount`, `url`, `tags[]` (до 5), `similar[]` (до 5: `{title, artist, url}`)

#### Scenario: Не найден
- **WHEN** трек не найден
- **THEN** `lastfm` равен `null`

---

### Requirement: YouTube секция
#### Scenario: С API-ключом
- **WHEN** `YOUTUBE_API_KEY` задан и видео найдено
- **THEN** `youtube` содержит `video_id`, `url`, `view_count`, `like_count`

#### Scenario: Без API-ключа
- **WHEN** ключ не задан
- **THEN** `youtube` содержит только `search_url`, `view_count` и `like_count` равны `null`
