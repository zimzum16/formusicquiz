## ADDED Requirements

### Requirement: Поиск треков по запросу
Система SHALL принимать запрос с названием трека и/или исполнителем и возвращать до 10 результатов из Spotify API.

#### Scenario: Успешный поиск
- **WHEN** пользователь отправляет GET `/api/tracks/search?q=название&artist=исполнитель`
- **THEN** система возвращает массив до 10 треков с полями: `id`, `title`, `artist`, `album`, `duration_ms`, `preview_url`, `cover_url`, `spotify_url`

#### Scenario: Поиск только по названию
- **WHEN** запрос содержит только `q` без `artist`
- **THEN** система возвращает результаты поиска только по названию

#### Scenario: Пустой запрос
- **WHEN** параметр `q` отсутствует или пустой
- **THEN** система возвращает 400 с `{"error": "Query is required"}`

#### Scenario: Нет результатов
- **WHEN** Spotify не находит треков по запросу
- **THEN** система возвращает 200 с пустым массивом `[]`

#### Scenario: Spotify недоступен
- **WHEN** Spotify API возвращает ошибку
- **THEN** система возвращает 502 с `{"error": "Search service unavailable"}`
