import { describe, expect, it } from 'vitest'
import { cutMp3, framesForRange, nearestEncoderBitrate, scanFrames, sliceFrames } from './mp3Container'
import { buildID3v2 } from './id3Writer'

// MPEG1 Layer III, 44.1 kHz, stereo, без CRC: FF FB, затем индекс битрейта в старшей тетраде
const BITRATE_IDX: Record<number, number> = { 128: 9, 192: 11 }
const frameSize = (kbps: number) => Math.floor(144 * kbps * 1000 / 44100)

function frame(kbps: number, fill: number): Uint8Array {
  const f = new Uint8Array(frameSize(kbps)).fill(fill)
  f.set([0xff, 0xfb, BITRATE_IDX[kbps] << 4, 0x00])
  return f
}

function xingFrame(): Uint8Array {
  const f = frame(128, 0)
  f.set([0x58, 0x69, 0x6e, 0x67], 36) // 'Xing' после заголовка и side info (32 байта для MPEG1 stereo)
  return f
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

function id3v1(): Uint8Array {
  const t = new Uint8Array(128)
  t.set([0x54, 0x41, 0x47]) // 'TAG'
  return t
}

const cbr = (n: number) => Array.from({ length: n }, (_, i) => frame(128, i + 1))

describe('scanFrames', () => {
  it('находит все CBR-фреймы и считает битрейт', () => {
    const idx = scanFrames(concat(...cbr(20)))!
    expect(idx.offsets.length).toBe(20)
    expect(idx.bitrate).toBe(128)
    expect(idx.sampleRate).toBe(44100)
    expect(idx.channels).toBe(2)
    expect(idx.isVbr).toBe(false)
    expect(idx.vbrHeaderFrame).toBeNull()
    expect(idx.frameDuration).toBeCloseTo(1152 / 44100)
  })

  it('пропускает ID3v2 в начале и ID3v1 в конце', () => {
    const tag = buildID3v2({ title: 'Test' })
    const idx = scanFrames(concat(tag, ...cbr(10), id3v1()))!
    expect(idx.offsets.length).toBe(10)
    expect(idx.offsets[0]).toBe(tag.length)
  })

  it('перешагивает мусор между фреймами', () => {
    const [a, b, c, d] = cbr(4)
    const junk = new Uint8Array(50).fill(0x11)
    const idx = scanFrames(concat(a, b, junk, c, d))!
    expect(idx.offsets.length).toBe(4)
    expect(idx.offsets[2]).toBe(a.length + b.length + junk.length)
  })

  it('распознаёт VBR по Xing и убирает служебный фрейм из таблицы', () => {
    const audio = [frame(128, 1), frame(192, 2), frame(128, 3), frame(192, 4)]
    const idx = scanFrames(concat(xingFrame(), ...audio))!
    expect(idx.isVbr).toBe(true)
    expect(idx.vbrHeaderFrame).not.toBeNull()
    expect(idx.offsets.length).toBe(4)
    expect(idx.bitrate).toBe(160)
  })

  it('возвращает null, если фреймов нет', () => {
    expect(scanFrames(new Uint8Array(5000).fill(0x42))).toBeNull()
  })
})

describe('framesForRange', () => {
  const idx = scanFrames(concat(...cbr(100)))!
  const fd = idx.frameDuration

  it('переводит секунды в номера фреймов', () => {
    expect(framesForRange(idx, 10 * fd, 20 * fd)).toEqual({ first: 10, last: 20 })
  })

  it('обрезает диапазон по границам файла и не даёт пустой фрагмент', () => {
    expect(framesForRange(idx, -5, 1000)).toEqual({ first: 0, last: 100 })
    expect(framesForRange(idx, 5 * fd, 5 * fd)).toEqual({ first: 5, last: 6 })
  })
})

describe('sliceFrames / cutMp3', () => {
  it('склеивает фреймы без мусора между ними', async () => {
    const frames = cbr(4)
    const junk = new Uint8Array(30).fill(0x11)
    const bytes = concat(frames[0], frames[1], junk, frames[2], frames[3])
    const idx = scanFrames(bytes)!
    const out = new Uint8Array(await sliceFrames(new Blob([bytes]), idx, { first: 1, last: 4 }).arrayBuffer())
    expect(out).toEqual(concat(frames[1], frames[2], frames[3]))
  })

  it('для CBR отдаёт фреймы как есть', async () => {
    const bytes = concat(...cbr(10))
    const idx = scanFrames(bytes)!
    const blob = cutMp3(new Blob([bytes]), idx, { first: 2, last: 5 })
    expect(blob.size).toBe(3 * frameSize(128))
  })

  it('для VBR пишет новый Xing с числом фреймов и байт', async () => {
    const audio = [frame(128, 1), frame(192, 2), frame(128, 3), frame(192, 4)]
    const bytes = concat(xingFrame(), ...audio)
    const idx = scanFrames(bytes)!
    const out = new Uint8Array(await cutMp3(new Blob([bytes]), idx, { first: 1, last: 3 }).arrayBuffer())
    const xing = idx.vbrHeaderFrame!.length
    const view = new DataView(out.buffer)
    expect(String.fromCharCode(...out.subarray(36, 40))).toBe('Xing')
    expect(view.getUint32(44)).toBe(2)
    expect(view.getUint32(48)).toBe(out.length)
    expect(out.subarray(xing)).toEqual(concat(audio[1], audio[2]))
  })
})

describe('nearestEncoderBitrate', () => {
  it('выбирает ближайший битрейт lamejs для частоты', () => {
    expect(nearestEncoderBitrate(130, 44100)).toBe(128)
    expect(nearestEncoderBitrate(500, 44100)).toBe(320)
    expect(nearestEncoderBitrate(150, 22050)).toBe(144)
    expect(nearestEncoderBitrate(10, 22050)).toBe(32)
  })
})
