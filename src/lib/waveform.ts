export function fadeEnvelopeMultiplier(
  tSec: number,
  range?: { startTime: number; endTime: number } | null,
  fade?: { fadeIn: boolean; fadeOut: boolean; fadeInDuration: number; fadeOutDuration: number } | null
): number {
  if (!range || !fade) return 1
  const S = range.startTime
  const E = range.endTime
  if (!Number.isFinite(tSec) || tSec < S || tSec > E) return 1
  let gIn = 1
  let gOut = 1
  if (fade.fadeIn && fade.fadeInDuration > 0)
    gIn = Math.min(1, Math.max(0, (tSec - S) / fade.fadeInDuration))
  if (fade.fadeOut && fade.fadeOutDuration > 0)
    gOut = Math.min(1, Math.max(0, (E - tSec) / fade.fadeOutDuration))
  return Math.min(gIn * gOut, 1)
}

export function drawWaveform(
  canvas: HTMLCanvasElement,
  audioBuffer: AudioBuffer,
  _isDark: boolean,
  trimRange?: { startTime: number; endTime: number } | null,
  trimFade?: { fadeIn: boolean; fadeOut: boolean; fadeInDuration: number; fadeOutDuration: number } | null
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height
  if (W === 0 || H === 0) return

  const data = audioBuffer.getChannelData(0)
  const totalSamples = Math.max(1, audioBuffer.length)

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0b1622'
  ctx.fillRect(0, 0, W, H)

  const padY = 70
  const halfAmp = Math.max((H - 2 * padY) / 2, 0)
  const cy = padY + halfAmp

  const BAR_W = 3
  const GAP = 1
  const STEP = BAR_W + GAP
  const barCount = Math.max(8, Math.floor(W / STEP))
  const durationSec = audioBuffer.duration

  for (let b = 0; b < barCount; b++) {
    const t0 = b / barCount
    const t1 = (b + 1) / barCount
    const idx0 = Math.floor(t0 * totalSamples)
    const idx1 = Math.floor(t1 * totalSamples)

    let peak = 0
    for (let i = idx0; i < idx1 && i < data.length; i++) {
      const v = Math.abs(data[i])
      if (v > peak) peak = v
    }
    peak = Math.pow(Math.min(peak, 1), 0.92)
    const tMid = durationSec > 0 ? (b + 0.5) / barCount * durationSec : 0
    const env = trimRange && trimFade ? fadeEnvelopeMultiplier(tMid, trimRange, trimFade) : 1
    const hHalf = Math.max(peak * halfAmp * env, env > 0 ? 0.65 * env : 0)

    const xPx = b * STEP
    if (xPx >= W) break

    ctx.fillStyle = '#26c6b6'
    ctx.fillRect(xPx, cy - hHalf, Math.min(BAR_W, W - xPx), hHalf * 2)
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, cy)
  ctx.lineTo(W, cy)
  ctx.stroke()
}
