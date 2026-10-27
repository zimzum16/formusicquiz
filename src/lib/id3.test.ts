import { describe, expect, it } from 'vitest'
import { buildID3v2 } from './id3Writer'
import { extractID3Tags, parseFilename } from './id3Parser'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
const AUDIO = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0])

const asFile = (...parts: Uint8Array[]) => new File(parts, 'track.mp3', { type: 'audio/mpeg' })

// ID3v2.3 c одним текстовым фреймом в заданной кодировке
function tagWithRawFrame(id: string, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(10 + payload.length)
  frame.set([...id].map(c => c.charCodeAt(0)))
  new DataView(frame.buffer).setUint32(4, payload.length)
  frame.set(payload, 10)
  const size = frame.length
  const header = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, (size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f])
  const out = new Uint8Array(header.length + frame.length)
  out.set(header)
  out.set(frame, header.length)
  return out
}

describe('buildID3v2 → extractID3Tags', () => {
  it('кириллица и обложка переживают запись и чтение', async () => {
    const tag = buildID3v2({
      title: 'Группа крови',
      artist: 'Кино',
      album: 'Группа крови',
      year: '1988-01-05',
      genre: 'Rock',
      cover: { mime: 'image/png', data: PNG },
    })
    const tags = await extractID3Tags(asFile(tag, AUDIO))
    expect(tags).toMatchObject({ title: 'Группа крови', artist: 'Кино', album: 'Группа крови', year: '1988', genre: 'Rock' })
    expect(tags.coverArt).toBe(`data:image/png;base64,${btoa(String.fromCharCode(...PNG))}`)
  })

  it('пустые и пробельные поля не пишутся', async () => {
    const tag = buildID3v2({ title: '  ', artist: 'A' })
    const tags = await extractID3Tags(asFile(tag, AUDIO))
    expect(tags.title).toBeUndefined()
    expect(tags.artist).toBe('A')
  })

  it('размер тега записан в synchsafe-формате', () => {
    const tag = buildID3v2({ cover: { mime: 'image/png', data: new Uint8Array(300) } })
    const size = (tag[6] << 21) | (tag[7] << 14) | (tag[8] << 7) | tag[9]
    expect(size).toBe(tag.length - 10)
    expect(tag.slice(6, 10).every(b => b < 0x80)).toBe(true)
  })
})

describe('extractID3Tags', () => {
  it('файл без тега → пустой объект', async () => {
    expect(await extractID3Tags(asFile(AUDIO))).toEqual({})
  })

  it('ISO-8859-1 с байтами cp1251 читается как кириллица', async () => {
    const cp1251 = new Uint8Array([0, 0xca, 0xe8, 0xed, 0xee]) // encoding 0 + «Кино»
    const tags = await extractID3Tags(asFile(tagWithRawFrame('TPE1', cp1251), AUDIO))
    expect(tags.artist).toBe('Кино')
  })

  it('обычная латиница в ISO-8859-1 не портится', async () => {
    const latin = new Uint8Array([0, ...[...'Nirvana'].map(c => c.charCodeAt(0))])
    const tags = await extractID3Tags(asFile(tagWithRawFrame('TPE1', latin), AUDIO))
    expect(tags.artist).toBe('Nirvana')
  })
})

describe('parseFilename', () => {
  it('делит «Исполнитель - Название» по разным тире', () => {
    expect(parseFilename('Кино - Звезда по имени Солнце.mp3')).toEqual({ artist: 'Кино', title: 'Звезда по имени Солнце' })
    expect(parseFilename('Nirvana — Lithium.mp3')).toEqual({ artist: 'Nirvana', title: 'Lithium' })
    expect(parseFilename('A - B - C.mp3')).toEqual({ artist: 'A', title: 'B - C' })
  })

  it('без разделителя — только название', () => {
    expect(parseFilename('track01.mp3')).toEqual({ title: 'track01' })
  })
})
