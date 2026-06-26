import { Mp3Encoder } from '@breezystack/lamejs'

const MP3_FRAME_SAMPLES = 1152

function float32ToInt16(data: Float32Array): Int16Array {
  const out = new Int16Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

interface EncodeRequest {
  leftBuffer: ArrayBuffer
  rightBuffer: ArrayBuffer | null
  sampleRate: number
  kbps: number
}

self.onmessage = (e: MessageEvent<EncodeRequest>) => {
  const { leftBuffer, rightBuffer, sampleRate, kbps } = e.data

  const leftF32 = new Float32Array(leftBuffer)
  const rightF32 = rightBuffer ? new Float32Array(rightBuffer) : undefined

  const isStereo = rightF32 !== undefined
  const left = float32ToInt16(leftF32)
  const right = rightF32 ? float32ToInt16(rightF32) : undefined

  const encoder = new Mp3Encoder(isStereo ? 2 : 1, sampleRate, kbps)
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

  ;(self as unknown as { postMessage(msg: unknown, transfer: Transferable[]): void }).postMessage({ chunks }, chunks)
}
