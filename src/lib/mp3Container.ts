// Разбор MP3 на уровне фреймов: позволяет резать файл без декодирования и перекодирования.
// Поддерживается только Layer III (MPEG1/2/2.5) — это все реальные .mp3.

const BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const SAMPLE_RATES_V1 = [44100, 48000, 32000]

interface FrameHeader {
  version: 1 | 2 | 25
  bitrate: number
  sampleRate: number
  channels: 1 | 2
  samplesPerFrame: number
  size: number
}

function parseHeader(b: Uint8Array, o: number): FrameHeader | null {
  if (o + 4 > b.length) return null
  if (b[o] !== 0xff || (b[o + 1] & 0xe0) !== 0xe0) return null
  const versionBits = (b[o + 1] >> 3) & 3
  const layerBits = (b[o + 1] >> 1) & 3
  const bitrateIdx = b[o + 2] >> 4
  const srIdx = (b[o + 2] >> 2) & 3
  if (versionBits === 1 || layerBits !== 1 || bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) return null

  const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 25
  const bitrate = (version === 1 ? BITRATES_V1 : BITRATES_V2)[bitrateIdx]
  const sampleRate = SAMPLE_RATES_V1[srIdx] / (version === 1 ? 1 : version === 2 ? 2 : 4)
  const padding = (b[o + 2] >> 1) & 1
  const samplesPerFrame = version === 1 ? 1152 : 576
  const size = Math.floor((samplesPerFrame / 8) * bitrate * 1000 / sampleRate) + padding
  const channels = (b[o + 3] >> 6) === 3 ? 1 : 2
  return { version, bitrate, sampleRate, channels, samplesPerFrame, size }
}

function sameStream(a: FrameHeader, b: FrameHeader): boolean {
  return a.version === b.version && a.sampleRate === b.sampleRate
}

function syncsafe(b: Uint8Array, o: number): number {
  return (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3]
}

// Границы аудиоданных: без ID3v2 в начале и ID3v1/APEv2 в конце
function audioBounds(b: Uint8Array): { start: number; end: number } {
  let start = 0
  // Бывает несколько ID3v2 подряд
  while (start + 10 <= b.length && b[start] === 0x49 && b[start + 1] === 0x44 && b[start + 2] === 0x33) {
    const hasFooter = (b[start + 5] & 0x10) !== 0
    start += 10 + syncsafe(b, start + 6) + (hasFooter ? 10 : 0)
  }

  let end = b.length
  if (end - 128 >= start && b[end - 128] === 0x54 && b[end - 127] === 0x41 && b[end - 126] === 0x47) end -= 128
  const ape = end - 32
  if (ape >= start && String.fromCharCode(...b.subarray(ape, ape + 8)) === 'APETAGEX') {
    const view = new DataView(b.buffer, b.byteOffset)
    const size = view.getUint32(ape + 12, true) // включает footer
    const hasHeader = (view.getUint32(ape + 20, true) & 0x80000000) !== 0
    end -= size + (hasHeader ? 32 : 0)
  }
  return { start, end: Math.max(start, end) }
}

// Смещение Xing/Info/VBRI внутри первого фрейма (после заголовка и side info)
function vbrTagOffset(h: FrameHeader): number {
  const sideInfo = h.version === 1 ? (h.channels === 2 ? 32 : 17) : (h.channels === 2 ? 17 : 9)
  return 4 + sideInfo
}

export interface Mp3FrameIndex {
  offsets: Uint32Array
  sizes: Uint16Array
  sampleRate: number
  channels: 1 | 2
  frameDuration: number
  // Средний битрейт, кбит/с (для CBR — точный)
  bitrate: number
  isVbr: boolean
  // Исходный Xing/VBRI-фрейм — шаблон для заголовка нарезанного VBR-файла
  vbrHeaderFrame: Uint8Array | null
}

export function scanFrames(b: Uint8Array): Mp3FrameIndex | null {
  const { start, end } = audioBounds(b)

  // Первый фрейм считаем найденным, только если за ним сразу идёт ещё один такой же —
  // иначе легко принять мусор за sync-слово
  const findFrom = (from: number, ref: FrameHeader | null): number => {
    for (let o = from; o + 4 <= end; o++) {
      const h = parseHeader(b, o)
      if (!h || (ref && !sameStream(ref, h))) continue
      const next = parseHeader(b, o + h.size)
      if (o + h.size === end || (next && sameStream(h, next))) return o
    }
    return -1
  }

  const first = findFrom(start, null)
  if (first < 0) return null
  const ref = parseHeader(b, first)!

  const offsets: number[] = []
  const sizes: number[] = []
  let o = first
  while (o + 4 <= end) {
    const h = parseHeader(b, o)
    if (h && sameStream(ref, h) && o + h.size <= end) {
      offsets.push(o)
      sizes.push(h.size)
      o += h.size
      continue
    }
    o = findFrom(o + 1, ref)
    if (o < 0) break
  }
  if (offsets.length < 2) return null

  let vbrHeaderFrame: Uint8Array | null = null
  let isVbr = false
  const tagAt = offsets[0] + vbrTagOffset(ref)
  const tag = String.fromCharCode(...b.subarray(tagAt, tagAt + 4))
  const vbri = String.fromCharCode(...b.subarray(offsets[0] + 36, offsets[0] + 40))
  if (tag === 'Xing' || tag === 'Info' || vbri === 'VBRI') {
    // Первый фрейм — служебный, звука в нём нет
    isVbr = tag === 'Xing' || vbri === 'VBRI'
    vbrHeaderFrame = b.slice(offsets[0], offsets[0] + sizes[0])
    offsets.shift()
    sizes.shift()
  }

  const frameDuration = ref.samplesPerFrame / ref.sampleRate
  const audioBytes = sizes.reduce((n, s) => n + s, 0)
  const bitrate = Math.round(audioBytes * 8 / (offsets.length * frameDuration) / 1000)

  return {
    offsets: Uint32Array.from(offsets),
    sizes: Uint16Array.from(sizes),
    sampleRate: ref.sampleRate,
    channels: ref.channels,
    frameDuration,
    bitrate,
    isVbr,
    vbrHeaderFrame: isVbr ? vbrHeaderFrame : null,
  }
}

export interface FrameRange {
  first: number
  last: number // не включительно
}

export function framesForRange(index: Mp3FrameIndex, startTime: number, endTime: number): FrameRange {
  const n = index.offsets.length
  const first = Math.min(n - 1, Math.max(0, Math.floor(startTime / index.frameDuration)))
  const last = Math.min(n, Math.max(first + 1, Math.round(endTime / index.frameDuration)))
  return { first, last }
}

// Xing-заголовок для нарезки VBR: без него плееры считают длительность по первому фрейму и врут
function buildXingFrame(template: Uint8Array, frameCount: number, totalBytes: number): Uint8Array | null {
  const h = parseHeader(template, 0)
  if (!h) return null
  const at = vbrTagOffset(h)
  if (at + 16 > template.length) return null
  const out = new Uint8Array(template.length) // всё после заголовка — нули, side info пустой → тишина
  out.set(template.subarray(0, 4))
  out.set([0x58, 0x69, 0x6e, 0x67], at) // 'Xing'
  const view = new DataView(out.buffer)
  view.setUint32(at + 4, 0x3) // флаги: есть число фреймов и байт, без TOC
  view.setUint32(at + 8, frameCount)
  view.setUint32(at + 12, totalBytes)
  return out
}

// Байты фреймов [first, last) из файла. Фреймы могут идти не подряд (мусор между ними),
// поэтому склеиваем по таблице, но соседние объединяем в один slice
export function sliceFrames(file: Blob, index: Mp3FrameIndex, range: FrameRange): Blob {
  const parts: Blob[] = []
  let runStart = index.offsets[range.first]
  let runEnd = runStart
  for (let i = range.first; i < range.last; i++) {
    const o = index.offsets[i]
    if (o !== runEnd) {
      parts.push(file.slice(runStart, runEnd))
      runStart = o
    }
    runEnd = o + index.sizes[i]
  }
  parts.push(file.slice(runStart, runEnd))
  return new Blob(parts, { type: 'audio/mpeg' })
}

// Готовый MP3-фрагмент без перекодирования (тег добавляется снаружи)
export function cutMp3(file: Blob, index: Mp3FrameIndex, range: FrameRange): Blob {
  const audio = sliceFrames(file, index, range)
  if (!index.vbrHeaderFrame) return audio
  const xingSize = index.vbrHeaderFrame.length
  const xing = buildXingFrame(index.vbrHeaderFrame, range.last - range.first, audio.size + xingSize)
  return xing ? new Blob([xing, audio], { type: 'audio/mpeg' }) : audio
}

// Ближайший битрейт, который умеет lamejs для данной частоты
export function nearestEncoderBitrate(kbps: number, sampleRate: number): number {
  const list = (sampleRate >= 32000 ? BITRATES_V1 : BITRATES_V2).filter(b => b >= 32)
  return list.reduce((best, b) => Math.abs(b - kbps) < Math.abs(best - kbps) ? b : best, list[0])
}
