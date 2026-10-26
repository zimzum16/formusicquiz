// Запись ID3v2.3-тега в начало MP3. Текст в UTF-16 с BOM — так кириллица читается во всех плеерах.

export interface ID3WriteTags {
  title?: string
  artist?: string
  album?: string
  year?: string
  genre?: string
  cover?: { mime: string; data: Uint8Array }
}

function utf16WithBom(text: string): Uint8Array {
  const out = new Uint8Array(3 + text.length * 2)
  out[0] = 1 // encoding: UTF-16 с BOM
  out[1] = 0xff
  out[2] = 0xfe
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    out[3 + i * 2] = c & 0xff
    out[4 + i * 2] = c >> 8
  }
  return out
}

function latin1(text: string): Uint8Array {
  return Uint8Array.from(text, c => c.charCodeAt(0) & 0xff)
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

function frame(id: string, data: Uint8Array): Uint8Array {
  const header = new Uint8Array(10)
  header.set(latin1(id), 0)
  new DataView(header.buffer).setUint32(4, data.length) // в v2.3 размер фрейма — обычный big-endian
  return concat([header, data])
}

export function buildID3v2(tags: ID3WriteTags): Uint8Array {
  const frames: Uint8Array[] = []
  const text: [string, string | undefined][] = [
    ['TIT2', tags.title],
    ['TPE1', tags.artist],
    ['TALB', tags.album],
    ['TYER', tags.year?.slice(0, 4)],
    ['TCON', tags.genre],
  ]
  for (const [id, value] of text) {
    if (value?.trim()) frames.push(frame(id, utf16WithBom(value.trim())))
  }
  if (tags.cover) {
    // encoding=0, MIME, picture type 3 (front cover), пустое описание
    frames.push(frame('APIC', concat([
      new Uint8Array([0]), latin1(tags.cover.mime), new Uint8Array([0, 3, 0]), tags.cover.data,
    ])))
  }

  const body = concat(frames)
  const size = body.length
  const header = new Uint8Array([
    0x49, 0x44, 0x33, 3, 0, 0,
    (size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f, // synchsafe
  ])
  return concat([header, body])
}

// Обложка может быть data: URL (из ID3 исходника) или http-ссылкой (Spotify/iTunes)
export async function fetchCover(url: string | undefined): Promise<ID3WriteTags['cover']> {
  if (!url) return undefined
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const data = new Uint8Array(await res.arrayBuffer())
    const mime = data[0] === 0x89 && data[1] === 0x50 ? 'image/png' : 'image/jpeg'
    return { mime, data }
  } catch {
    return undefined
  }
}
