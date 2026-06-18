export type SectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'unknown'

export interface SongMarker {
  start: number
  end: number
  type: SectionType
  label: string
}

interface LrcLine { time: number; text: string }

interface GeniusSection {
  type: SectionType
  label: string
  lines: string[]
}

const BASE = import.meta.env.VITE_API_URL ?? ''

async function fetchGeniusSections(title: string, artist: string): Promise<GeniusSection[]> {
  try {
    const params = new URLSearchParams({ title, artist })
    const res = await fetch(`${BASE}/api/tracks/lyrics?${params}`)
    if (!res.ok) return []
    const data: { sections: GeniusSection[] } = await res.json()
    return data.sections ?? []
  } catch {
    return []
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
    .replace(/'/g, '')        // апостроф убираем: "don't" → "dont", "it's" → "its"
    .replace(/[^\w\s]/g, ' ')
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

function alignSections(
  sections: GeniusSection[],
  lrcLines: LrcLine[],
  duration: number
): SongMarker[] {
  const markers: SongMarker[] = []
  let searchFrom = 0

  for (const section of sections) {
    // Пробуем первые 3 непустые строки секции — берём лучший результат
    const candidates = section.lines.filter(l => l.trim().length > 3).slice(0, 3)
    if (candidates.length === 0) continue

    let bestScore = 0
    let bestIdx = -1

    const normCandidates = candidates.map(normalize)

    outer:
    for (let i = searchFrom; i < lrcLines.length; i++) {
      const normTarget = normalize(lrcLines[i].text)
      for (const normQuery of normCandidates) {
        const score = matchScore(normQuery, normTarget)
        if (score > bestScore) {
          bestScore = score
          bestIdx = i
          if (bestScore === 1) break outer // идеальное совпадение — дальше не ищем
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

  return markers
}

export async function analyzeSongStructure(
  title: string,
  artist: string,
  duration: number
): Promise<SongMarker[]> {
  const [sections, lrcLines] = await Promise.all([
    fetchGeniusSections(title, artist),
    fetchLrcLines(title, artist),
  ])

  if (sections.length === 0 || lrcLines.length === 0) return []

  return alignSections(sections, lrcLines, duration)
}
