## Context

Текущий `src/pages/Editor.tsx` — монолитный файл (~430 строк): логика, UI и вспомогательные функции в одном месте. В папке `used/` лежат компоненты значительно более высокого уровня, написанные ранее для того же проекта. Задача — перенести и адаптировать их в текущую структуру `src/`, не ломая остального.

Текущий стек: `@breezystack/lamejs` уже установлен (MP3-энкодер), `lucide-react` есть. Хуков нет (`src/hooks/` отсутствует). Роутинг через `useState<Page>` в `App.tsx` — не меняется.

## Goals / Non-Goals

**Goals:**
- Разбить `Editor.tsx` на компоненты и хук, оставив `Editor.tsx` тонким оркестратором
- Добавить интерактивный waveform с draggable-маркерами из `used/components/WaveformDisplay.tsx`
- Добавить ID3-парсер с Cyrillic-починкой (`used/utils/id3Parser.ts` → `src/lib/id3Parser.ts`)
- Заменить числовые поля времени на MM:SS.S формат
- Добавить плеер результатов с seek и громкостью
- Создать `src/lib/songStructure.ts` — новый модуль анализа структуры, с нуля

**Non-Goals:**
- Бэкенд, API, auth — без изменений
- Страницы кроме Editor — не трогать
- Supabase-интеграция из `used/` — не переносить (используем свой бэкенд)
- Реализация всех стратегий анализа структуры сразу — только архитектура + базовая (LRCLib + fallback)

## Decisions

### 1. Структура директорий

```
src/
  components/editor/
    WaveformDisplay.tsx
    FadeControls.tsx
    TrimControls.tsx
    MultiTrimPanel.tsx
    ProcessedResults.tsx
    ImageSearchBlock.tsx
  hooks/
    useAudioEditor.ts
  lib/
    id3Parser.ts          (адаптирован из used/)
    songStructure.ts      (новый, с нуля)
    audioTrim.ts          (существующий, без изменений)
    audioMetadata.ts      (существующий, без изменений)
```

**Почему `components/editor/`**: компоненты специфичны для редактора, не переиспользуются на других страницах — изолируем в поддиректорию чтобы не засорять `components/`.

### 2. Перенос компонентов из `used/`

Компоненты берём из `used/` как основу, но адаптируем:
- Убираем все импорты Supabase (нет в текущем проекте)
- Убираем `useTheme`-зависимости — у нас тема живёт в `App.tsx`/Tailwind
- Сохраняем CSS-классы Tailwind как есть — стек тот же

**Альтернатива**: переписать с нуля. Отклонено — код из `used/` уже протестирован и содержит нетривиальную логику (ID3 CP1251 починка, waveform drag, fade envelope).

### 3. ID3 парсер

`src/lib/id3Parser.ts` адаптируется из `used/utils/id3Parser.ts`. Возвращает:
```ts
interface ID3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  coverArtUrl?: string; // blob URL
}
```
Fallback: если ID3 нет или поля пустые — парсим имя файла (существующая логика `extractFilename`).

### 4. Анализ структуры песни — стратегии

`src/lib/songStructure.ts` реализует цепочку fallback стратегий:

| Стратегия | Источник данных | Точность | Доступность |
|---|---|---|---|
| **A. LRCLib API** | Бесплатный REST API синхронных текстов с секциями `[Verse]`/`[Chorus]` | Высокая | Только если трек есть в базе |
| **B. Локальный RMS-анализ** | Web Audio API: RMS-энергия + zero-crossing rate по окнам | Средняя | Всегда, без сети |
| **C. Эвристика по длительности** | Типичная структура поп-песни (intro 0–15s, verse, chorus, ...) | Низкая | Всегда |

Цепочка: A → B → C (если A вернул пустой результат, пробуем B, затем C).

**Почему не Spotify**: требует backend + OAuth, это Этап 3.  
**Почему не Python microservice**: отдельный сервис — вне скопа MVP.

Стратегия B (RMS) пишется с нуля, а не переносится из `used/utils/audioAnalysis.ts` — там 13KB избыточного кода, нам нужно компактное решение.

### 5. useAudioEditor — стейт-машин

```
IDLE → FILE_LOADED (upload + decode + ID3) → READY → PROCESSING → DONE
                          ↓ параллельно (фон)
                     Spotify search → обновить coverArt / album / year
                          ↓
                     Genius info → обновить geniusUrl
```

Хук управляет:
- `audioBuffer: AudioBuffer | null` — один декодированный буфер, шарится между всеми WaveformDisplay
- `segments: Segment[]` — список сегментов
- `processedFiles: ProcessedFile[]` — результаты обрезки
- `audioFile.geniusUrl?: string` — ссылка на текст с Genius, заполняется асинхронно после загрузки

Обогащение из Spotify/Genius запускается через `void (async () => { ... })()` после `setAudioFile` — не блокирует UI, ошибки игнорируются (graceful degradation).

**Почему хук, а не контекст**: единственный потребитель — `Editor.tsx`. Контекст избыточен.

### 7. Авто-обогащение метаданных

После загрузки файла и парсинга ID3-тегов хук делает два последовательных запроса к бэкенду:

1. `GET /api/tracks/search?q={title}&artist={artist}` → берём первый результат Spotify:
   - `cover_url` → заменяет ID3 обложку (Spotify даёт 640×640 vs обычные 300px из тегов)
   - `album` → если не было в ID3
   - `release_date.slice(0, 4)` → год, если не было в ID3

2. `GET /api/tracks/{id}/info` → из `genius.lyrics_url` заполняем `audioFile.geniusUrl`

Приоритеты: Spotify данные перезаписывают только пустые ID3-поля, кроме `coverArt` — обложка Spotify всегда предпочтительнее (выше качество).

**Graceful degradation**: оба запроса в try/catch без setError — если API недоступен, данные из ID3 остаются.

### 6. WaveformDisplay — draggable маркеры

Маркеры реализованы через `onMouseDown/onMouseMove/onMouseUp` на canvas-подобном div (не canvas). Fade-огибающая рисуется как SVG-оверлей. Компонент принимает `onSegmentChange` callback — изменения поднимаются в хук.

## Risks / Trade-offs

- **WaveformDisplay из used/ — 34KB**: большой компонент. Риск: в нём могут быть неиспользуемые фичи или баги. → Митигация: адаптируем минимально, сохраняя рабочую логику.
- **CP1251 ID3 починка**: эвристика, может сломаться на редких кодировках. → Принимаем как есть — лучше чем ничего.
- **LRCLib API**: внешний сервис, может быть недоступен. → Fallback на RMS гарантирует работу без сети.
- **RMS анализ**: на очень коротких треках (<60s) структура будет некачественной. → Fallback на эвристику по длительности.

## Migration Plan

1. Создать `src/components/editor/` и `src/hooks/`
2. Перенести/адаптировать компоненты из `used/` (без Supabase)
3. Написать `src/lib/id3Parser.ts`
4. Написать `src/lib/songStructure.ts` с нуля
5. Написать `src/hooks/useAudioEditor.ts`
6. Рефакторить `Editor.tsx` — оставить только вёрстку и подключение хука
7. Проверить typecheck + lint

Rollback: `used/` папка не удаляется, старый `Editor.tsx` в git-истории.

## Open Questions

- Показывать ли маркеры структуры (куплет/припев) прямо на waveform? Или только отдельной секцией?

## Resolved Questions

- **Нужна ли обложка из ID3 в UI редактора?** → Да, в `SongInfo` компоненте; Spotify-обложка заменяет ID3 при наличии (выше качество).
