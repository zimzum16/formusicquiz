## Why

Редактор позволяет обрезать треки по времени, но пользователь вынужден вручную угадывать границы куплетов и припевов. Если показывать секции прямо на waveform-е, пользователь кликает на нужный блок — и сегмент уже выставлен.

## What Changed

- **`GET /api/tracks/:id/lyrics`** — новый бэкенд-эндпоинт: скрейпит страницу Genius по `lyrics_url`, возвращает секции с текстом `[{ type, label, text }]`

- **`src/lib/songStructure.ts`** — модуль определения структуры. Получает секции из Genius-текста, получает таймкоды из LRCLib, сопоставляет первые строки каждой секции с LRC-строками → возвращает `SongMarker[]` с реальными временны́ми границами

- **`src/components/editor/SongStructurePanel.tsx`** — панель секций: список куплет/припев/бридж с кнопкой «применить сегмент» (устанавливает `startTime`/`endTime` в редакторе)

- **`WaveformDisplay.tsx`** — цветные полосы секций поверх waveform-а (опциональный проп `markers`)

- **`useAudioEditor.ts`** — запуск анализа после загрузки файла, хранение `songMarkers` в стейте

## Non-Goals

- Транскрипция через Whisper (следующий этап)
- ML-модели или pitch-анализ
- Ручное редактирование меток пользователем
- Изменение auth, роутинга

## Capabilities

### New Capabilities

- `song-structure-analysis`: Получение и сопоставление секций Genius + LRCLib → `SongMarker[]` с таймкодами

### Modified Capabilities

- `audio-editor-state`: Хук `useAudioEditor` дополнен `songMarkers` и запуском анализа структуры
- `audio-editor-ui`: `WaveformDisplay` с цветными секциями; новая `SongStructurePanel`
- `song-info-backend`: Новый эндпоинт `/api/tracks/:id/lyrics` для получения текста с Genius
