import type { TrimSegment, ProcessedAudioFile } from '../types/audio'
import { buildID3v2, type ID3WriteTags } from './id3Writer'
import { cutMp3, framesForRange, nearestEncoderBitrate, sliceFrames, type Mp3FrameIndex } from './mp3Container'

// Битрейт перекодирования, когда битрейт исходника неизвестен
const DEFAULT_MP3_KBPS = 128

function encodeToMP3Worker(leftF32: Float32Array, rightF32: Float32Array | undefined, sampleRate: number, kbps: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./audioWorker.ts', import.meta.url), { type: 'module' })

    // Копируем subarray в standalone-буферы для transfer (zero-copy передача в Worker)
    const leftBuffer = leftF32.slice().buffer
    const rightBuffer = rightF32 ? rightF32.slice().buffer : null

    worker.onmessage = (e: MessageEvent<{ chunks: ArrayBuffer[] }>) => {
      const blob = new Blob(e.data.chunks, { type: 'audio/mpeg' })
      worker.terminate()
      resolve(blob)
    }
    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }

    const transferable: Transferable[] = [leftBuffer]
    if (rightBuffer) transferable.push(rightBuffer)
    worker.postMessage({ leftBuffer, rightBuffer, sampleRate, kbps }, transferable)
  })
}

export async function processAudioSegment(
  audioBuffer: AudioBuffer,
  segment: TrimSegment,
  tags: ID3WriteTags,
  index: number,
  kbps = DEFAULT_MP3_KBPS
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
    leftF32 = audioBuffer.getChannelData(0).slice(start, end)
    rightF32 = isStereo ? audioBuffer.getChannelData(1).slice(start, end) : undefined
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
    leftF32 = rendered.getChannelData(0).slice()
    rightF32 = isStereo ? rendered.getChannelData(1).slice() : undefined
  }

  const mp3 = await encodeToMP3Worker(leftF32, rightF32, sr, kbps)
  return toProcessedFile(segment.id, mp3, duration, tags, index)
}

function toProcessedFile(id: string, mp3: Blob, duration: number, tags: ID3WriteTags, index: number): ProcessedAudioFile {
  const blob = new Blob([buildID3v2(tags), mp3], { type: 'audio/mpeg' })

  const sanitize = (s: string | undefined) => (s ?? '').split('\x00').join('').trim()
  const a = sanitize(tags.artist) || 'Unknown'
  const t = sanitize(tags.title) || 'Track'

  return {
    id,
    name: `${a} - ${t} (фрагмент ${index}).mp3`,
    blob,
    url: URL.createObjectURL(blob),
    duration,
  }
}

// Экспорт по таблице MP3-фреймов: без fade — копирование фреймов как есть (качество и битрейт
// исходника, без декодирования); с fade — декодируется и перекодируется только нужный кусок
export async function exportMp3Segment(
  file: File,
  frames: Mp3FrameIndex,
  segment: TrimSegment,
  tags: ID3WriteTags,
  index: number
): Promise<ProcessedAudioFile> {
  const range = framesForRange(frames, segment.startTime, segment.endTime)

  if (!segment.fadeIn && !segment.fadeOut) {
    const duration = (range.last - range.first) * frames.frameDuration
    return toProcessedFile(segment.id, cutMp3(file, frames, range), duration, tags, index)
  }

  // Фрейм перед началом нужен декодеру: данные фрейма могут лежать в предыдущем (bit reservoir)
  const chunkRange = { first: Math.max(0, range.first - 1), last: range.last }
  const chunkStart = chunkRange.first * frames.frameDuration
  const chunk = await sliceFrames(file, frames, chunkRange).arrayBuffer()
  // OfflineAudioContext с частотой исходника — decodeAudioData не будет ресемплировать
  const ctx = new OfflineAudioContext(frames.channels, 1, frames.sampleRate)
  const buffer = await ctx.decodeAudioData(chunk)

  const local: TrimSegment = {
    ...segment,
    startTime: Math.max(0, segment.startTime - chunkStart),
    endTime: Math.min(buffer.duration, segment.endTime - chunkStart),
  }
  return processAudioSegment(buffer, local, tags, index, nearestEncoderBitrate(frames.bitrate, frames.sampleRate))
}

export function formatTimeDetailed(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  // Округляем до десятых до деления на минуты, иначе 59.96 → "00:60.0"
  const tenths = Math.round(sec * 10)
  const m = Math.floor(tenths / 600)
  const [whole, frac] = ((tenths - m * 600) / 10).toFixed(1).split('.')
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
