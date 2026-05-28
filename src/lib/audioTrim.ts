import { Mp3Encoder } from '@breezystack/lamejs';

export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  ctx.close();
  return buffer;
}

export function extractWaveform(buffer: AudioBuffer, bars: number): number[] {
  const channels = buffer.numberOfChannels;
  const blockSize = Math.floor(buffer.length / bars);
  const result: number[] = [];

  for (let i = 0; i < bars; i++) {
    let sum = 0;
    const start = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      let s = 0;
      for (let c = 0; c < channels; c++) s += Math.abs(buffer.getChannelData(c)[start + j] ?? 0);
      sum += s / channels;
    }
    result.push(sum / blockSize);
  }

  const max = Math.max(...result, 0.001);
  return result.map(v => v / max);
}

export async function trimSegment(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
  fadeInSec: number,
  fadeOutSec: number
): Promise<AudioBuffer> {
  const duration = endSec - startSec;
  const sr = buffer.sampleRate;
  const channels = buffer.numberOfChannels;

  const ctx = new OfflineAudioContext(channels, Math.ceil(duration * sr), sr);
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const gain = ctx.createGain();
  if (fadeInSec > 0) {
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(1, fadeInSec);
  } else {
    gain.gain.setValueAtTime(1, 0);
  }
  if (fadeOutSec > 0) {
    gain.gain.setValueAtTime(1, Math.max(fadeInSec, duration - fadeOutSec));
    gain.gain.linearRampToValueAtTime(0, duration);
  }

  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(0, startSec, duration);

  return ctx.startRendering();
}

export function encodeMP3(buffer: AudioBuffer, bitrate = 128): Blob {
  const channels = buffer.numberOfChannels;
  const isStereo = channels > 1;
  const encoder = new Mp3Encoder(isStereo ? 2 : 1, buffer.sampleRate, bitrate);

  const left = toInt16(buffer.getChannelData(0));
  const right = isStereo ? toInt16(buffer.getChannelData(1)) : undefined;

  const chunks: ArrayBuffer[] = [];
  const blockSize = 1152;

  const push = (data: Uint8Array) => {
    if (data.length > 0)
      chunks.push(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  };

  for (let i = 0; i < left.length; i += blockSize) {
    const l = left.subarray(i, i + blockSize);
    const r = right?.subarray(i, i + blockSize);
    push(r ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l));
  }

  push(encoder.flush());

  return new Blob(chunks, { type: 'audio/mpeg' });
}

function toInt16(float32: Float32Array): Int16Array {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return out;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
