export type SectionType = 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'post-chorus' | 'bridge' | 'outro' | 'unknown'

export interface SongMarker {
  start: number
  end: number
  type: SectionType
  label: string
}

export interface SongAnalysis {
  markers: SongMarker[]
  title: string
  artist: string
  geniusUrl?: string
  isCover?: boolean
}

interface LrcLine { time: number; text: string }

interface GeniusSection {
  type: SectionType
  label: string
  lines: string[]
}

const BASE = import.meta.env.VITE_API_URL ?? ''

interface GeniusResult {
  sections: GeniusSection[]
  title: string
  artist: string
  url?: string
  isCover?: boolean
}

function inferTypeFromLabel(label: string): SectionType {
  const l = label.toLowerCase()
  if (/пост.припев|post.chorus/.test(l)) return 'post-chorus'
  if (/пред.припев|pre.chorus/.test(l)) return 'pre-chorus'
  if (/куплет|verse/.test(l)) return 'verse'
  if (/припев|chorus|refrain|hook/.test(l)) return 'chorus'
  if (/бридж|bridge/.test(l)) return 'bridge'
  if (/интро|intro/.test(l)) return 'intro'
  if (/аутро|outro/.test(l)) return 'outro'
  return 'unknown'
}

async function fetchGeniusSections(title: string, artist: string): Promise<GeniusResult> {
  try {
    const params = new URLSearchParams({ title, artist })
    const res = await fetch(`${BASE}/api/tracks/lyrics?${params}`)
    if (!res.ok) return { sections: [], title: '', artist: '' }
    const data: GeniusResult = await res.json()
    const sections = (data.sections ?? []).map(s => ({
      ...s,
      type: s.type === 'unknown' ? inferTypeFromLabel(s.label) : s.type,
    }))
    return { sections, title: data.title ?? '', artist: data.artist ?? '', url: data.url, isCover: data.isCover }
  } catch {
    return { sections: [], title: '', artist: '' }
  }
}

async function fetchLrcLines(title: string, artist: string): Promise<LrcLine[]> {
  try {
    const params = new URLSearchParams({ title, artist })
    const res = await fetch(`${BASE}/api/tracks/lrc?${params}`)
    if (!res.ok) return []
    const data: { lines: LrcLine[] } = await res.json()
    return data.lines ?? []
  } catch {
    return []
  }
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^\wа-яёА-ЯЁ\s]/g, ' ') // \w не включает кириллицу — добавляем явно
    .replace(/\s+/g, ' ')
    .trim()
}

// Пересечение уникальных слов / max(qSize, tSize) — не даёт score=1 если цель длиннее запроса
function wordCoverage(query: string, target: string): number {
  const qWords = new Set(query.split(' ').filter(Boolean))
  const tWords = new Set(target.split(' ').filter(Boolean))
  if (qWords.size === 0) return 0
  let hits = 0
  for (const w of qWords) if (tWords.has(w)) hits++
  return hits / Math.max(qWords.size, tWords.size)
}

// Dice-коэффициент на символьных биграммах: ловит "ha" vs "hah", опечатки и т.п.
function diceBigrams(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return 0
  const bigrams = (s: string) => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2)
      m.set(bg, (m.get(bg) ?? 0) + 1)
    }
    return m
  }
  const ba = bigrams(a), bb = bigrams(b)
  let common = 0
  for (const [bg, cnt] of ba) common += Math.min(cnt, bb.get(bg) ?? 0)
  return (2 * common) / (a.length - 1 + (b.length - 1))
}

function matchScore(normQuery: string, normTarget: string): number {
  // LRC содержит Genius-строку — надёжное совпадение (LRC объединяет несколько строк Genius)
  if (normTarget.includes(normQuery)) return 1

  // Обратная ветка (Genius содержит LRC) убрана — вызывала ложные срабатывания
  // когда похожие короткие фразы встречаются в нескольких секциях

  return Math.max(wordCoverage(normQuery, normTarget), diceBigrams(normQuery, normTarget))
}

// After finding a strong match at anchorIdx, verify that at least one of the
// subsequent Genius candidates also appears within the next few LRC lines.
// This prevents false positives when sections share an opening line
// (e.g. outro and final chorus start identically).
// LRC files split lines differently than Genius, so we use a loose window of
// 6 LRC lines and a low threshold (0.4) to tolerate partial line breaks.
function confirmContext(normCandidates: string[], anchorIdx: number, lrcLines: LrcLine[]): boolean {
  if (normCandidates.length <= 1) return true
  const limit = Math.min(anchorIdx + 6, lrcLines.length)
  for (let k = anchorIdx + 1; k < limit; k++) {
    const t = normalize(lrcLines[k].text)
    for (let c = 1; c < normCandidates.length; c++) {
      if (matchScore(normCandidates[c], t) >= 0.4) return true
    }
  }
  return false
}

function alignSections(
  sections: GeniusSection[],
  lrcLines: LrcLine[],
  duration: number
): SongMarker[] {
  const markers: SongMarker[] = []
  let searchFrom = 0

  for (const section of sections) {
    // Первые 3 непустые строки — кандидаты для поиска
    const candidates = section.lines.filter(l => l.trim().length > 3).slice(0, 3)
    if (candidates.length === 0) continue

    let bestScore = 0
    let bestIdx = -1

    const normCandidates = candidates.map(normalize)

    // Single-line matching: for each LRC line, take max score across all candidates.
    // When score >= 0.8, verify that a subsequent candidate also appears nearby
    // (prevents anchoring on a shared opening line from the previous section).
    // Falls back to the raw best-score position if context never confirms.
    outer:
    for (let i = searchFrom; i < lrcLines.length; i++) {
      const normTarget = normalize(lrcLines[i].text)
      for (const normQuery of normCandidates) {
        const score = matchScore(normQuery, normTarget)
        if (score > bestScore) {
          bestScore = score
          bestIdx = i
          // Stop at the first "good enough + confirmed" match rather than
          // scanning to the end for a slightly better one. A lower threshold
          // here prevents sections from drifting to later parts of the song
          // where a shared phrase happens to score higher.
          if (bestScore >= 0.65 && confirmContext(normCandidates, i, lrcLines)) {
            break outer
          }
        }
      }
    }

    if (bestScore >= 0.55 && bestIdx >= 0) {
      markers.push({
        start: lrcLines[bestIdx].time,
        end: 0,
        type: section.type,
        label: section.label,
      })
      // Advance past a minimum gap so the next section cannot start within
      // the first 10 s of this one (prevents pre-chorus from anchoring on
      // an LRC line that is still inside the verse).
      const MIN_GAP = 10
      const sectionStart = lrcLines[bestIdx].time
      let next = bestIdx + 1
      while (next < lrcLines.length && lrcLines[next].time < sectionStart + MIN_GAP) next++
      searchFrom = next
    } else if (bestIdx >= 0 && bestScore >= 0.3) {
      // Low-confidence match: don't place a marker but advance past this position
      // so the next section doesn't anchor itself in this section's LRC territory
      searchFrom = bestIdx + 1
    }
  }

  // Sort by start time and fill end times
  markers.sort((a, b) => a.start - b.start)
  for (let i = 0; i < markers.length; i++) {
    markers[i].end = i + 1 < markers.length ? markers[i + 1].start : duration
  }

  // Если первые слова начинаются не с нуля — добавляем или расширяем Интро
  if (markers.length > 0 && markers[0].start > 2) {
    if (markers[0].type === 'intro') {
      markers[0] = { ...markers[0], start: 0 }
    } else {
      markers.unshift({ start: 0, end: markers[0].start, type: 'intro', label: 'Интро' })
    }
  }

  // Если последняя секция занимает > 40% песни — возможно это аутро, не отмеченное в Genius
  const last = markers[markers.length - 1]
  if (markers.length > 0 && last && (duration - last.start) / duration > 0.4) {
    // Ищем в LRC первую строку после последнего маркера, где текст не похож на слова секции
    const lastSectionEnd = lrcLines.findIndex(l => l.time >= last.start + 20)
    if (lastSectionEnd >= 0 && lastSectionEnd < lrcLines.length - 1) {
      const outroStart = lrcLines[lastSectionEnd].time
      markers[markers.length - 1] = { ...last, end: outroStart }
      markers.push({ start: outroStart, end: duration, type: 'outro', label: 'Аутро' })
    }
  }

  return markers
}

export async function analyzeSongStructure(
  title: string,
  artist: string,
  duration: number,
  onGeniusResolved?: (title: string, artist: string) => void
): Promise<SongAnalysis> {
  const stripParens = (s: string) => s.replace(/\s*\([^)]*\)/g, '').trim()

  // Genius и LRC запускаем параллельно, но title/artist обновляем сразу как Genius ответил
  const geniusPromise = fetchGeniusSections(title, artist).then(g => {
    const resolvedTitle = stripParens(g.title || title)
    const resolvedArtist = stripParens(g.artist || artist)
    onGeniusResolved?.(resolvedTitle, resolvedArtist)
    return { ...g, resolvedTitle, resolvedArtist }
  })
  const lrcPromise = fetchLrcLines(title, artist)

  const [genius, lrcLines] = await Promise.all([geniusPromise, lrcPromise])

  if (genius.sections.length === 0) return { markers: [], title: genius.resolvedTitle, artist: genius.resolvedArtist, geniusUrl: genius.url, isCover: genius.isCover }

  // Если LRC не нашёлся с исходным title — retry с очищенным названием из Genius
  const lines = lrcLines.length === 0 && genius.resolvedTitle !== title
    ? await fetchLrcLines(genius.resolvedTitle, genius.resolvedArtist)
    : lrcLines

  if (lines.length === 0) return { markers: [], title: genius.resolvedTitle, artist: genius.resolvedArtist, geniusUrl: genius.url, isCover: genius.isCover }

  return { markers: alignSections(genius.sections, lines, duration), title: genius.resolvedTitle, artist: genius.resolvedArtist, geniusUrl: genius.url, isCover: genius.isCover }
}
