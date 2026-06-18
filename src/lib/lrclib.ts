export interface LrcLine {
  time: number
  text: string
}

const LRC_LINE_RE = /^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/

function parseLrc(syncedLyrics: string): LrcLine[] {
  return syncedLyrics
    .split('\n')
    .map(line => {
      const m = line.match(LRC_LINE_RE)
      if (!m) return null
      const time = parseInt(m[1], 10) * 60 + parseFloat(m[2])
      const text = m[3].trim()
      if (!text || text === '♪' || text === '🎵') return null
      return { time, text }
    })
    .filter((l): l is LrcLine => l !== null)
}

interface LrclibResult {
  syncedLyrics: string | null
}

export async function fetchLrcLines(title: string, artist: string): Promise<LrcLine[]> {
  try {
    const params = new URLSearchParams({ track_name: title, artist_name: artist })
    const res = await fetch(`https://lrclib.net/api/search?${params}`, {
      headers: { 'Lrclib-Client': 'SoundLens/1.0' },
    })
    if (!res.ok) return []

    const results: LrclibResult[] = await res.json()
    const hit = results.find(r => r.syncedLyrics)
    if (!hit?.syncedLyrics) return []

    return parseLrc(hit.syncedLyrics)
  } catch {
    return []
  }
}
