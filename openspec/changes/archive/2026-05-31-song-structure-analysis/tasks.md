## 1. Бэкенд: скрейпинг Genius

- [x] 1.1 В `server/routes/tracks.ts` добавить маршрут `GET /tracks/lyrics?url=` (Zod-схема: `{ url: z.string().url() }`)
- [x] 1.2 Реализовать хендлер: fetch Genius-страницы с `User-Agent` браузера, извлечь `data-lyrics-container` div-ы через regex, заменить `<br>` → `\n`, убрать теги
- [x] 1.3 Парсить очищенный текст: строки `[Section Name]` — заголовки секций, последующие строки — `lines[]`
- [x] 1.4 Замаппить заголовки на `SectionType` (verse/chorus/bridge/intro/outro/unknown)
- [x] 1.5 Добавить in-memory кэш с TTL 1 час по `url`
- [x] 1.6 При ошибке fetch возвращать `{ sections: [] }` (не 500)

## 2. Фронтенд: LRCLib

- [x] 2.1 Создать `src/lib/lrclib.ts` — интерфейс `LrcLine { time: number, text: string }`
- [x] 2.2 Реализовать `fetchLrcLines(title, artist)`: запрос к `lrclib.net/api/search`, взять первый результат с `syncedLyrics`
- [x] 2.3 Парсить LRC-строки: regex `[MM:SS.xx] text` → `{ time, text }`, пропускать пустые и `[♪]`

## 3. Фронтенд: модуль анализа структуры

- [x] 3.1 Создать `src/lib/songStructure.ts` — экспортировать `SectionType`, `SongMarker`
- [x] 3.2 Реализовать `fetchGeniusSections(geniusUrl)`: вызов `GET /api/tracks/lyrics?url=`, вернуть `GeniusSection[]`
- [x] 3.3 Реализовать `alignSections(sections, lrcLines, duration)`: нормализация строк, Jaccard-сходство по словам, порог 0.4, сборка `SongMarker[]` с `start`/`end`
- [x] 3.4 Реализовать главную функцию `analyzeSongStructure(title, artist, geniusUrl, duration)`: вызвать `fetchGeniusSections` + `fetchLrcLines` параллельно (`Promise.all`), затем `alignSections`; при пустом результате любого шага вернуть `[]`

## 4. Интеграция в хук

- [x] 4.1 Добавить `songMarkers: SongMarker[]` и `isAnalyzingStructure: boolean` в стейт `useAudioEditor`
- [x] 4.2 После получения `geniusUrl` (в существующем фоновом блоке) запустить `analyzeSongStructure` фоново: `setIsAnalyzingStructure(true)` → `.then(setSongMarkers)` → `.finally(() => setIsAnalyzingStructure(false))`
- [x] 4.3 В `handleRemoveFile` сбросить `songMarkers = []`, `isAnalyzingStructure = false`
- [x] 4.4 Добавить `songMarkers` и `isAnalyzingStructure` в return хука

## 5. UI: WaveformDisplay

- [x] 5.1 Добавить `markers?: SongMarker[]` в `WaveformDisplayProps`
- [x] 5.2 В функции отрисовки canvas, после `drawWaveform`, нарисовать полупрозрачные прямоугольники для каждого маркера (координаты через `marker.start / duration * canvasWidth`)
- [x] 5.3 Добавить текстовую метку `marker.label` — `ctx.fillText`, 10px, левый верхний угол полосы

## 6. UI: SongStructurePanel

- [x] 6.1 Создать `src/components/editor/SongStructurePanel.tsx` с пропами `markers`, `isAnalyzing`, `onApplySegment`
- [x] 6.2 Состояние `isAnalyzing` → показывать 3 skeleton-карточки
- [x] 6.3 Состояние пустых маркеров → текст «Секции не определены»
- [x] 6.4 Рендерить карточки: цветная левая полоса, `marker.label`, время `MM:SS – MM:SS`, кнопка «Применить»
- [x] 6.5 Клик «Применить» → `onApplySegment(marker.start, marker.end)`

## 7. Интеграция в Editor.tsx

- [x] 7.1 Передать `markers={songMarkers}` в `WaveformDisplay` основного сегмента
- [x] 7.2 Добавить `<SongStructurePanel markers={songMarkers} isAnalyzing={isAnalyzingStructure} onApplySegment={(s, e) => updateSegment(0, { startTime: s, endTime: e })} />`

## 8. Проверка

- [x] 8.1 `npm run typecheck` — устранить все ошибки TS
- [x] 8.2 `npm run lint` — устранить предупреждения ESLint (новые файлы чистые; ошибки в applemusic.ts/yandex.ts предсуществующие)
- [x] 8.3 Проверить вручную: загрузить MP3 с известным треком → дождаться секций → применить → `startTime`/`endTime` обновились → полосы видны на waveform
- [x] 8.4 Проверить трек без LRC в LRCLib → панель показывает «Секции не определены», ошибок нет
