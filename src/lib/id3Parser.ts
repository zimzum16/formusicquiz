export interface ID3Tags {
  artist?: string
  title?: string
  album?: string
  year?: string
  genre?: string
  coverArt?: string
}

export async function extractID3Tags(file: File): Promise<ID3Tags> {
  try {
    const buffer = await file.arrayBuffer()
    const view = new DataView(buffer)

    const id3Header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2))
    if (id3Header !== 'ID3') return {}

    const majorVersion = view.getUint8(3)
    const tagSize =
      (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9)

    let offset = 10
    const tagEnd = offset + tagSize
    const tags: ID3Tags = {}

    while (offset < tagEnd - 10) {
      const frameId = String.fromCharCode(
        view.getUint8(offset), view.getUint8(offset + 1),
        view.getUint8(offset + 2), view.getUint8(offset + 3)
      )

      if (frameId === '\x00\x00\x00\x00') break

      let frameSize: number
      if (majorVersion === 4) {
        frameSize =
          (view.getUint8(offset + 4) << 21) | (view.getUint8(offset + 5) << 14) |
          (view.getUint8(offset + 6) << 7) | view.getUint8(offset + 7)
      } else {
        frameSize =
          (view.getUint8(offset + 4) << 24) | (view.getUint8(offset + 5) << 16) |
          (view.getUint8(offset + 6) << 8) | view.getUint8(offset + 7)
      }

      offset += 10
      if (frameSize <= 0 || offset + frameSize > tagEnd) break

      const frameData = new Uint8Array(buffer, offset, frameSize)

      if (frameId.startsWith('T') && frameId !== 'TXXX') {
        const text = decodeTextFrame(frameData)
        if (frameId === 'TIT2') tags.title = text
        else if (frameId === 'TPE1') tags.artist = text
        else if (frameId === 'TALB') tags.album = text
        else if (frameId === 'TYER' || frameId === 'TDRC') tags.year = text
        else if (frameId === 'TCON') tags.genre = text
      }

      if (frameId === 'APIC') tags.coverArt = extractCoverArt(frameData)

      offset += frameSize
    }

    tags.title = finalizeField(tags.title)
    tags.artist = finalizeField(tags.artist)
    tags.album = finalizeField(tags.album)
    tags.genre = finalizeField(tags.genre)

    return tags
  } catch {
    return {}
  }
}

export function parseFilename(filename: string): { artist?: string; title?: string } {
  const name = filename.replace(/\.[^.]+$/i, '')
  for (const sep of [' - ', ' — ', ' – ']) {
    if (name.includes(sep)) {
      const parts = name.split(sep).map(s => s.trim())
      if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(sep) }
    }
  }
  return { title: name }
}

function hasCyrillic(text: string): boolean {
  return /[Ѐ-ӿ]/.test(text)
}

function looksLikeLatin1Mojibake(text: string): boolean {
  if (hasCyrillic(text) || text.length === 0) return false
  let hi = 0
  for (const c of text) {
    const cp = c.charCodeAt(0)
    if (cp >= 0x80 && cp <= 0xff) hi++
  }
  return hi / text.length > 0.25
}

function stripNulls(text: string): string {
  return text.split('\x00').join('').trim()
}

function repairCp1251(s: string): string {
  if (!s || hasCyrillic(s)) return s
  if (!looksLikeLatin1Mojibake(s)) return s
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c > 255) return s
    bytes[i] = c
  }
  const fixed = stripNulls(new TextDecoder('windows-1251').decode(bytes))
  return hasCyrillic(fixed) ? fixed : s
}

function finalizeField(s: string | undefined): string | undefined {
  if (!s) return s
  return repairCp1251(stripNulls(s))
}

function decodeIso8859OrCp1251(data: Uint8Array): string {
  const iso = stripNulls(new TextDecoder('iso-8859-1').decode(data))
  const cp1251 = stripNulls(new TextDecoder('windows-1251').decode(data))
  if (hasCyrillic(cp1251) && !hasCyrillic(iso)) return cp1251
  if (looksLikeLatin1Mojibake(iso) && hasCyrillic(cp1251)) return cp1251
  return iso
}

function decodeTextFrame(data: Uint8Array): string {
  if (data.length === 0) return ''
  const encoding = data[0]
  const textData = data.slice(1)
  try {
    switch (encoding) {
      case 0: return decodeIso8859OrCp1251(textData)
      case 1: return stripNulls(new TextDecoder('utf-16').decode(textData))
      case 2: return stripNulls(new TextDecoder('utf-16be').decode(textData))
      case 3: {
        const utf8 = stripNulls(new TextDecoder('utf-8', { fatal: false }).decode(textData))
        if (hasCyrillic(utf8)) return utf8
        const from1251 = stripNulls(new TextDecoder('windows-1251').decode(textData))
        if (hasCyrillic(from1251) && !hasCyrillic(utf8)) return from1251
        if (/�/.test(utf8) && hasCyrillic(from1251)) return from1251
        if (looksLikeLatin1Mojibake(utf8) && hasCyrillic(from1251)) return from1251
        return utf8
      }
      default: return stripNulls(new TextDecoder('utf-8', { fatal: false }).decode(textData))
    }
  } catch {
    return ''
  }
}

function extractCoverArt(data: Uint8Array): string | undefined {
  try {
    let offset = 1
    while (offset < data.length && data[offset] !== 0) offset++
    offset++
    offset++ // picture type
    while (offset < data.length && data[offset] !== 0) offset++
    offset++

    const imageData = data.slice(offset)
    const mimeType = (imageData[0] === 0x89 && imageData[1] === 0x50) ? 'image/png' : 'image/jpeg'

    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < imageData.length; i += chunkSize) {
      binary += String.fromCharCode(...imageData.subarray(i, i + chunkSize))
    }
    return `data:${mimeType};base64,${btoa(binary)}`
  } catch {
    return undefined
  }
}
