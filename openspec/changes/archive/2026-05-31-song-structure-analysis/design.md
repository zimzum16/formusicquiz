## Context

Бэкенд уже вызывает Genius API и возвращает `lyrics_url` (ссылка на страницу Genius) через `/api/tracks/:id/info`. Фронтенд хранит `geniusUrl` в `AudioFile`. LRCLib — публичное API без ключей, возвращает синхронизированный LRC-текст с таймкодами.

Текущий стек: Hono + Node.js (бэкенд), React + TypeScript (фронт), `useAudioEditor` управляет состоянием редактора.

## Goals / Non-Goals

**Goals:**
- Бэкенд скрейпит Genius-страницу → секции с текстом
- Фронтенд получает LRCLib-тайминги и выравнивает по ним Genius-секции
- `SongMarker[]` с реальными временны́ми границами появляются на waveform-е и в панели
- При клике «Применить» → `startTime`/`endTime` обновляются в редакторе

**Non-Goals:**
- Транскрипция (Whisper) — следующий этап
- Ручное редактирование меток
- Поддержка форматов кроме LRC

## Decisions

### 1. Полный поток данных

```
Файл загружен → ID3 распарсен → title + artist известны
                                       │
               ┌───────────────────────┤
               │                       │
               ▼                       ▼
  GET /api/lyrics?url=<geniusUrl>   GET lrclib.net/api/search
  (бэкенд скрейпит Genius)          (фронтенд, напрямую)
               │                       │
               ▼                       ▼
  sections[]                       lrcLines[]
  [{ type, label, lines[] }]       [{ time, text }]
               │                       │
               └──────────┬────────────┘
                          ▼
                   alignSections()
                   fuzzy-match первая строка секции ↔ LRC-строки
                          │
                          ▼
                   SongMarker[] → waveform + панель
```

### 2. Бэкенд: GET /api/lyrics?url=

Новый маршрут в `server/routes/tracks.ts`:

```
GET /api/tracks/lyrics?url=<encoded_genius_url>
→ { sections: [{ type: SectionType, label: string, lines: string[] }] }
```

Шаги:
1. Fetch Genius-страницы с User-Agent браузера (обход базовой защиты)
2. Из HTML извлечь содержимое `data-lyrics-container="true"` div-ов
3. Заменить `<br>` → `\n`, убрать все HTML-теги через regex
4. Распарсить текст: строки вида `[Chorus]`, `[Verse 1]`, `[Bridge]` — это заголовки секций
5. Собрать `{ type, label, lines[] }` — `lines` это текстовые строки до следующего заголовка

Маппинг заголовков (case-insensitive):
- `verse`, `куплет` → `'verse'`
- `chorus`, `припев`, `refrain` → `'chorus'`
- `bridge`, `бридж` → `'bridge'`
- `intro`, `интро`, `intro` → `'intro'`
- `outro`, `аутро`, `coda`, `outro` → `'outro'`
- всё остальное → `'unknown'`

Кэш: простой in-memory Map с TTL 1 час (по `url` как ключу).

Если Genius недоступен → `{ sections: [] }` (не ошибка, фронт продолжает с пустыми секциями).

### 3. Фронтенд: парсинг LRC из LRCLib

```typescript
// src/lib/lrclib.ts
interface LrcLine { time: number; text: string }

async function fetchLrcLines(title: string, artist: string): Promise<LrcLine[]>
```

1. `GET https://lrclib.net/api/search?track_name=<title>&artist_name=<artist>`
2. Взять первый результат с непустым `syncedLyrics`
3. Парсить LRC построчно: `/^\[(\d+):(\d+\.\d+)\]\s*(.*)$/`
4. `time = minutes * 60 + seconds`, `text = строка`
5. Вернуть массив `LrcLine` (без пустых строк и строк-инструменталей `[♪]`)

### 4. Фронтенд: выравнивание секций

```typescript
// src/lib/songStructure.ts
function alignSections(sections: GeniusSection[], lrcLines: LrcLine[], duration: number): SongMarker[]
```

Алгоритм:
1. Для каждой секции взять первую непустую строку `firstLine`
2. Нормализовать: lowercase, убрать пунктуацию, коллапсить пробелы
3. Для каждой LRC-строки посчитать **word overlap** (пересечение слов / объединение слов = Jaccard)
4. Взять LRC-строку с максимальным Jaccard ≥ 0.4 → её `time` = `marker.start`
5. `marker.end` = `start` следующего маркера (или `duration` для последнего)
6. Если совпадение не найдено — секция пропускается (не добавляется в результат)

Итоговый тип `SongMarker`:
```typescript
export interface SongMarker {
  start: number    // секунды
  end: number      // секунды
  type: SectionType
  label: string    // «Куплет 1», «Припев» и т.д.
}
export type SectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'unknown'
```

Главная функция:
```typescript
export async function analyzeSongStructure(
  title: string,
  artist: string,
  geniusUrl: string | undefined,
  duration: number
): Promise<SongMarker[]>
```

Если `geniusUrl` не задан или Genius вернул пустые секции → `[]`.
Если LRCLib не нашёл трек → `[]`.

### 5. Интеграция в useAudioEditor

Добавить в стейт:
```typescript
const [songMarkers, setSongMarkers] = useState<SongMarker[]>([])
const [isAnalyzingStructure, setIsAnalyzingStructure] = useState(false)
```

Запуск после Genius-обогащения (в уже существующем фоновом блоке):
```typescript
// после получения geniusUrl и setAudioFile:
setIsAnalyzingStructure(true)
analyzeSongStructure(title, artist, geniusUrl, audioBuffer.duration)
  .then(setSongMarkers)
  .finally(() => setIsAnalyzingStructure(false))
```

`handleRemoveFile` → `setSongMarkers([])`, `setIsAnalyzingStructure(false)`.

Вернуть из хука: `songMarkers`, `isAnalyzingStructure`.

### 6. WaveformDisplay: проп markers

```typescript
markers?: SongMarker[]
```

Отрисовка после `drawWaveform`: полупрозрачные прямоугольники на canvas.

Цвета:
| Тип | Цвет заливки |
|---|---|
| `intro` / `outro` | `rgba(59,130,246,0.15)` |
| `verse` | `rgba(34,197,94,0.15)` |
| `chorus` | `rgba(168,85,247,0.2)` |
| `bridge` | `rgba(249,115,22,0.18)` |
| `unknown` | `rgba(107,114,128,0.1)` |

Метка (`marker.label`) — `ctx.fillText`, 10px, левый верхний угол полосы.

### 7. SongStructurePanel

```typescript
interface SongStructurePanelProps {
  markers: SongMarker[]
  isAnalyzing: boolean
  onApplySegment: (start: number, end: number) => void
}
```

- `isAnalyzing=true` → 3 skeleton-карточки
- `markers.length === 0 && !isAnalyzing` → текст «Секции не определены»
- Иначе → список карточек: цветная левая полоса, `marker.label`, время `MM:SS – MM:SS`, кнопка «Применить»

Цвет полосы соответствует цветам из п. 6.

### 8. Новые файлы

```
server/
  routes/tracks.ts     — добавить /lyrics?url= маршрут

src/
  lib/
    lrclib.ts          — новый: fetchLrcLines
    songStructure.ts   — новый: SongMarker, SectionType, analyzeSongStructure
  components/editor/
    SongStructurePanel.tsx  — новый
  hooks/
    useAudioEditor.ts  — +songMarkers, +isAnalyzingStructure
  components/editor/
    WaveformDisplay.tsx — +markers prop
  pages/
    Editor.tsx          — передаём markers, рендерим SongStructurePanel
```
