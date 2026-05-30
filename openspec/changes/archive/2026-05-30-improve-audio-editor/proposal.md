## Why

Текущий редактор (`src/pages/Editor.tsx`) реализует базовую обрезку, но в папке `used/` уже лежат готовые компоненты значительно более высокого уровня — интерактивный waveform с draggable-маркерами, ID3-парсер с поддержкой кириллицы, полноценный стейт-машин. Без переноса этих компонентов редактор остаётся примитивным прототипом, а готовый код простаивает без дела.

## What Changed

- **Авто-обогащение из Spotify + Genius** — после загрузки MP3 фоновый запрос к `/api/tracks/search` обновляет обложку (640×640), альбом, год; затем `/api/tracks/:id/info` подтягивает ссылку на текст песни с Genius; ID3-данные остаются если API недоступен
- **Waveform с draggable маркерами** — заменяет статичный bar-waveform на интерактивный с визуальным перетаскиванием границ сегмента и fade-огибающей (canvas, PointerEvents)
- **ID3-парсер** — извлекает теги из аудиофайла (исполнитель, альбом, год, обложка) с починкой CP1251 мусора в кириллице; fallback на имя файла
- **Время в формате MM:SS.S** — поля ввода в человекочитаемом формате с клавиатурной навигацией (↑/↓), валидацией диапазона
- **Fade in/out с кастомными SVG-иконками** — компонент с выбором длительности 1–4 сек, inline и card-вариантами
- **Несколько сегментов** — `MultiTrimPanel` для доп. сегментов начиная со второго
- **Плеер обработанных файлов** — `ProcessedResults` с прогресс-баром, seek, громкостью, mute, скачиванием каждого и «Скачать все»
- **Поиск обложек** — `ImageSearchBlock` с кастомными SVG-иконками для Яндекс/Google/Bing/DDG, открывает в новой вкладке
- **Стейт-машин** — вся логика вынесена из `Editor.tsx` в `useAudioEditor.ts`; управляет AudioContext, декодированным буфером, ID3-тегами

## Capabilities

### New Capabilities

- `audio-editor-ui`: Визуальный редактор — WaveformDisplay с маркерами, FadeControls, TrimControls (MM:SS.S), MultiTrimPanel, ProcessedResults; весь UI редактора
- `audio-editor-state`: Хук `useAudioEditor` — файл→ID3→сегменты→обработка; фоновое обогащение из Spotify (обложка, альбом, год) и Genius (lyrics_url); управление AudioContext, декодированным буфером
- `id3-extraction`: Парсер ID3v2-тегов из ArrayBuffer с fallback на имя файла; поддержка CP1251→UTF-8 для кириллических тегов, извлечение обложки (APIC)

### Modified Capabilities

- `song-info-page`: Секция поиска обложек перенесена в `ImageSearchBlock` (те же 4 движка)

## Impact

### Новые файлы

- **`src/components/editor/WaveformDisplay.tsx`** — интерактивный waveform (canvas + SVG маркеры)
- **`src/components/editor/FadeControls.tsx`** — контролы fade in/out (inline + card варианты)
- **`src/components/editor/TrimControls.tsx`** — поля MM:SS.S с клавиатурной навигацией
- **`src/components/editor/MultiTrimPanel.tsx`** — панель дополнительных сегментов
- **`src/components/editor/ProcessedResults.tsx`** — плеер обработанных файлов
- **`src/components/editor/ImageSearchBlock.tsx`** — поиск обложек (4 движка)
- **`src/components/editor/FileUpload.tsx`** — загрузка файла с прогресс-баром
- **`src/components/editor/AudioPlayer.tsx`** — скрытый `<audio>` элемент через forwardRef
- **`src/hooks/useAudioEditor.ts`** — стейт-машин редактора
- **`src/lib/id3Parser.ts`** — ID3v2 парсер (адаптирован из `used/`)
- **`src/lib/waveform.ts`** — drawWaveform + fadeEnvelopeMultiplier
- **`src/lib/audioUtils.ts`** — processAudioSegment, MP3-энкодинг, форматирование времени
- **`src/lib/imageSearch.ts`** — URL-билдеры для 4 поисковиков
- **`src/types/audio.ts`** — типы AudioFile, TrimSegment, ProcessedAudioFile, FadeDuration

### Изменённые файлы

- **`src/pages/Editor.tsx`** — полный рефакторинг: весь UI заменён на новые компоненты, логика — на `useAudioEditor`
- **`src/hooks/useAudioEditor.ts`** — добавлено фоновое обогащение через `tracksApi.search` + `tracksApi.getInfo`
- **`src/types/audio.ts`** — добавлено поле `geniusUrl?: string` в `AudioFile`
- **`src/components/editor/SongInfo.tsx`** — новый компонент с иконками, обложкой, ссылкой на Genius
- **`eslint.config.js`** — добавлен `used/**` в ignores (reference-код, не продакшн)
- **`server/routes/auth.ts`** — исправлен `any` → типизированный `catch`

### Не реализовано (отложено)

- `src/lib/songStructure.ts` — анализ структуры песни (куплет/припев); перенесено за пределы скопа MVP

### Без изменений

- Бэкенд, API, auth, роутинг
- Страницы кроме Editor
