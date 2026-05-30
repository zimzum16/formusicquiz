## 1. Подготовка структуры

- [x] 1.1 Создать директорию `src/components/editor/`
- [x] 1.2 Создать директорию `src/hooks/`
- [x] 1.3 Проверить, что `@breezystack/lamejs` установлен (уже есть в package.json)

## 2. ID3-парсер

- [x] 2.1 Создать `src/lib/id3Parser.ts` — адаптировать из `used/utils/id3Parser.ts`: убрать лишние зависимости, оставить ID3v2.3/2.4 парсинг, CP1251-починку, APIC-обложку
- [x] 2.2 Экспортировать интерфейс `ID3Tags { title, artist, album, year, genre, coverArtUrl }` и функцию `parseID3Tags(buffer: ArrayBuffer): ID3Tags`
- [x] 2.3 Добавить fallback: если title не найден — парсить имя файла, разделитель ` - ` → artist/title

## 3. Стейт-машин хука

- [x] 3.1 Создать `src/hooks/useAudioEditor.ts` — адаптировать из `used/hooks/useAudioEditor.ts`: убрать Supabase, убрать geniusService/spotifyService
- [x] 3.2 Реализовать состояния: `idle | loading | ready | processing | done`
- [x] 3.3 Интегрировать вызов `parseID3Tags` сразу после декодирования файла
- [x] 3.4 Реализовать методы: `handleFileSelect`, `handleRemoveFile`, `handleTrim`, `addSegment`, `updateSegment`, `removeSegment`
- [x] 3.5 Хранить единый `audioBuffer` и передавать его по ссылке во все компоненты

## 4. UI-компоненты редактора

- [x] 4.1 Создать `src/components/editor/WaveformDisplay.tsx` — адаптировать из `used/components/WaveformDisplay.tsx`: draggable маркеры, fade-огибающая SVG, убрать зависимости на useTheme и Supabase
- [x] 4.2 Создать `src/components/editor/FadeControls.tsx` — адаптировать из `used/components/FadeControls.tsx`: кнопки fade-in/out, SVG-иконки, выбор 1–4 сек
- [x] 4.3 Создать `src/components/editor/TrimControls.tsx` — адаптировать из `used/components/TrimControls.tsx`: поля MM:SS.S, клавиатурная навигация ↑/↓, валидация диапазона
- [x] 4.4 Создать `src/components/editor/MultiTrimPanel.tsx` — адаптировать из `used/components/MultiTrimPanel.tsx`: список доп. сегментов, кнопка добавить/удалить
- [x] 4.5 Создать `src/components/editor/ProcessedResults.tsx` — адаптировать из `used/components/ProcessedResults.tsx`: карточки с плеером, seek-бар, регулятор громкости, скачивание, «Скачать все»
- [x] 4.6 Создать `src/components/editor/ImageSearchBlock.tsx` — адаптировать из `used/components/ImageSearchBlock.tsx`: 4 движка (Яндекс/Google/Bing/DDG) с кастомными SVG-иконками, `noopener noreferrer`

## 5. Рефакторинг Editor.tsx

- [x] 5.1 Заменить inline-логику на `useAudioEditor` хук
- [x] 5.2 Заменить статичный waveform на `WaveformDisplay` для каждого сегмента
- [x] 5.3 Заменить числовые инпуты на `TrimControls` (MM:SS.S)
- [x] 5.4 Заменить кнопки TrendingUp/TrendingDown на `FadeControls`
- [x] 5.5 Заменить список сегментов на `MultiTrimPanel`
- [x] 5.6 Заменить раздел результатов на `ProcessedResults`
- [x] 5.7 Заменить секцию imageLinks на `ImageSearchBlock`

## 7. Авто-обогащение метаданных из Spotify + Genius

- [x] 7.1 Добавить `geniusUrl?: string` в интерфейс `AudioFile` (`src/types/audio.ts`)
- [x] 7.2 В `useAudioEditor.ts` после `setAudioFile` запускать фоновый запрос: `tracksApi.search(title, artist)` → обновить `coverArt`, `album`, `year` из первого Spotify-результата
- [x] 7.3 После получения Spotify ID вызвать `tracksApi.getInfo(id)` → записать `genius.lyrics_url` в `audioFile.geniusUrl`
- [x] 7.4 В `SongInfo.tsx` показывать ссылку «Открыть на Genius» с иконкой `ExternalLink` если `geniusUrl` заполнен

## 8. Финальная проверка

- [x] 8.1 Запустить `npm run typecheck` — устранить все ошибки TS
- [x] 8.2 Запустить `npm run lint` — устранить все предупреждения ESLint
- [x] 8.3 Проверить вручную: загрузка MP3 → отображение ID3 тегов → авто-обогащение из Spotify → появление ссылки Genius → перетаскивание маркеров → fade → обрезка → плеер → скачивание
- [x] 8.4 Проверить поиск обложек — все 4 движка открывают корректные URL в новой вкладке
