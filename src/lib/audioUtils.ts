import { Mp3Encoder } from '@breezystack/lamejs'
import type { TrimSegment, ProcessedAudioFile } from '../types/audio'

const EXPORT_MP3_KBPS = 128
const MP3_FRAME_SAMPLES = 1152

export async function processAudioSegment(
  audioBuffer: AudioBuffer,
  segment: TrimSegment,
  artist: string,
  title: string,
  index: number
): Promise<ProcessedAudioFile> {
  const duration = segment.endTime - segment.startTime
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Некорректный интервал обрезки')
  }

  const sr = audioBuffer.sampleRate
  const isStereo = audioBuffer.numberOfChannels > 1
  let leftF32: Float32Array
  let rightF32: Float32Array | undefined

  if (!segment.fadeIn && !segment.fadeOut) {
    // Быстрый путь: нет fade — берём PCM напрямую, без OfflineAudioContext
    const start = Math.floor(segment.startTime * sr)
    const end = Math.min(Math.ceil(segment.endTime * sr), audioBuffer.length)
    leftF32 = audioBuffer.getChannelData(0).subarray(start, end)
    rightF32 = isStereo ? audioBuffer.getChannelData(1).subarray(start, end) : undefined
  } else {
    // Полный путь через OfflineAudioContext для применения fade
    const frameCount = Math.max(1, Math.floor(duration * sr))
    const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, frameCount, sr)
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    const gain = offlineCtx.createGain()
    source.connect(gain)
    gain.connect(offlineCtx.destination)

    if (segment.fadeIn) {
      gain.gain.setValueAtTime(0, 0)
      gain.gain.linearRampToValueAtTime(1, segment.fadeInDuration)
    } else {
      gain.gain.setValueAtTime(1, 0)
    }
    if (segment.fadeOut) {
      gain.gain.setValueAtTime(1, Math.max(0, duration - segment.fadeOutDuration))
      gain.gain.linearRampToValueAtTime(0, duration)
    }

    source.start(0, segment.startTime, duration)
    const rendered = await offlineCtx.startRendering()
    leftF32 = rendered.getChannelData(0)
    rightF32 = isStereo ? rendered.getChannelData(1) : undefined
  }

  const blob = encodeToMP3(leftF32, rightF32, sr)

  const sanitize = (s: string) => s.split('\x00').join('').trim()
  const a = sanitize(artist) || 'Unknown'
  const t = sanitize(title) || 'Track'

  return {
    id: segment.id,
    name: `${a} - ${t} (фрагмент ${index}).mp3`,
    blob,
    url: URL.createObjectURL(blob),
    duration,
  }
}

function float32ToInt16(data: Float32Array): Int16Array {
  const out = new Int16Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function encodeToMP3(leftF32: Float32Array, rightF32: Float32Array | undefined, sampleRate: number): Blob {
  const isStereo = rightF32 !== undefined
  const left = float32ToInt16(leftF32)
  const right = rightF32 ? float32ToInt16(rightF32) : undefined

  const encoder = new Mp3Encoder(isStereo ? 2 : 1, sampleRate, EXPORT_MP3_KBPS)
  const chunks: ArrayBuffer[] = []

  const push = (data: Uint8Array) => {
    if (data.length > 0)
      chunks.push(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer)
  }

  for (let i = 0; i < left.length; i += MP3_FRAME_SAMPLES) {
    const l = left.subarray(i, i + MP3_FRAME_SAMPLES)
    const r = right?.subarray(i, i + MP3_FRAME_SAMPLES)
    push(r ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l))
  }
  push(encoder.flush())

  return new Blob(chunks, { type: 'audio/mpeg' })
}

export function formatTimeDetailed(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  const [whole, frac] = s.toFixed(1).split('.')
  return `${m.toString().padStart(2, '0')}:${whole.padStart(2, '0')}.${frac}`
}

export function formatTimeDetailedComma(sec: number): string {
  return formatTimeDetailed(sec).replace('.', ',')
}

export function parseFlexibleTime(value: string): number {
  const t = value.trim()
  if (!t) return 0
  const dec = t.match(/^(\d+):(\d{1,2})\.(\d)$/)
  if (dec) {
    return parseInt(dec[1], 10) * 60 + parseInt(dec[2], 10) + parseInt(dec[3], 10) / 10
  }
  const parts = t.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0
    const secPart = parts[1]
    if (secPart.includes('.')) {
      const [w, f] = secPart.split('.')
      return mins * 60 + (parseInt(w, 10) || 0) + (parseInt((f + '0').slice(0, 1), 10) || 0) / 10
    }
    return mins * 60 + (parseInt(secPart, 10) || 0)
  }
  const f = parseFloat(t)
  return Number.isFinite(f) ? f : 0
}

export function validateTimeRange(start: number, end: number, max: number): string | null {
  if (start < 0 || end < 0) return 'Время не может быть отрицательным'
  if (start >= end) return 'Начало должно быть раньше конца'
  if (end > max) return 'Конец не может превышать длительность трека'
  return null
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
