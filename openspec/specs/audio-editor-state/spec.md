## ADDED Requirements

### Requirement: Стейт-машин хук useAudioEditor
Хук `useAudioEditor` SHALL инкапсулировать все состояния и переходы аудиоредактора, предоставляя компонентам только данные и колбэки.

#### Scenario: Загрузка файла
- **WHEN** вызван `handleFileSelect(file)` с корректным аудиофайлом
- **THEN** хук последовательно: декодирует аудио в AudioBuffer, извлекает waveform-данные, запускает ID3-парсер; после завершения устанавливает `state = 'ready'`

#### Scenario: Ошибка декодирования
- **WHEN** файл не является аудио или повреждён
- **THEN** `decodeError` устанавливается в строку с описанием ошибки, `state` остаётся `'idle'`

#### Scenario: Удаление файла
- **WHEN** вызван `handleRemoveFile()`
- **THEN** сбрасываются audioBuffer, segments, processedFiles, id3Tags; `state = 'idle'`

---

### Requirement: Единый AudioBuffer для всех сегментов
Хук SHALL хранить один декодированный `AudioBuffer` и передавать его всем сегментам, не декодируя файл повторно.

#### Scenario: Общий буфер
- **WHEN** файл загружен и несколько WaveformDisplay рендерятся одновременно
- **THEN** все компоненты получают ссылку на один и тот же `AudioBuffer` объект

---

### Requirement: Управление сегментами
Хук SHALL предоставлять методы `addSegment`, `updateSegment`, `removeSegment`.

#### Scenario: Добавление сегмента
- **WHEN** вызван `addSegment()`
- **THEN** в `segments` добавляется новый элемент `{ start: 0, end: 30, fadeIn: 2, fadeOut: 2, showFadeIn: false, showFadeOut: false }`

#### Scenario: Обновление поля сегмента
- **WHEN** вызван `updateSegment(id, 'start', 10)`
- **THEN** сегмент с данным id обновляет только поле `start`, остальные поля не изменяются

#### Scenario: Минимум один сегмент
- **WHEN** вызван `removeSegment(id)` и это единственный сегмент
- **THEN** удаление игнорируется, сегмент остаётся

---

### Requirement: Обработка сегментов
Хук SHALL запускать обрезку всех сегментов через `trimSegment` и сохранять результаты в `processedFiles`.

#### Scenario: Успешная обработка
- **WHEN** вызван `handleTrim()` и audioBuffer не null
- **THEN** `isTrimming = true`, запускается `Promise.all` по всем сегментам; после завершения `processedFiles` содержит обрезанные буферы, `state = 'done'`

#### Scenario: Повторная обработка
- **WHEN** `handleTrim()` вызывается второй раз
- **THEN** предыдущие `processedFiles` сбрасываются, начинается новая обработка

---

### Requirement: ID3 метаданные в состоянии
Хук SHALL автоматически запускать ID3-парсер после загрузки файла и сохранять результат в `audioFile`.

#### Scenario: Успешный парсинг ID3
- **WHEN** файл содержит ID3v2-теги
- **THEN** `audioFile` содержит title, artist, album, year, coverArt из тегов

#### Scenario: ID3 отсутствуют
- **WHEN** файл не содержит ID3-теги
- **THEN** `audioFile.title` и `audioFile.artist` парсятся из имени файла (разделитель ` - `), остальные поля `undefined`

---

### Requirement: Авто-обогащение метаданных из Spotify и Genius
Хук SHALL после установки `audioFile` запускать фоновое обогащение через бэкенд API.

#### Scenario: Успешное обогащение из Spotify
- **WHEN** `tracksApi.search(title, artist)` возвращает результаты
- **THEN** `audioFile.coverArt` обновляется на обложку Spotify (640×640), `album` и `year` заполняются если были пустыми

#### Scenario: Получение ссылки Genius
- **WHEN** `tracksApi.getInfo(spotifyId)` возвращает `genius.lyrics_url`
- **THEN** `audioFile.geniusUrl` устанавливается в это значение

#### Scenario: API недоступен
- **WHEN** любой из запросов к API бросает исключение
- **THEN** ошибка игнорируется, `audioFile` остаётся с данными из ID3, UI не показывает ошибку
