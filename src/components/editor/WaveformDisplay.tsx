import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { AudioFile } from '../../types/audio'
import { drawWaveform, fadeEnvelopeMultiplier } from '../../lib/waveform'
import { formatTimeDetailed, formatTimeDetailedComma } from '../../lib/audioUtils'
import type { SongMarker, SectionType } from '../../lib/songStructure'

const MIN_TRIM_DURATION = 0.05

const MARKER_LINE_COLORS: Record<SectionType, string> = {
  intro:   'rgba(96,165,250,0.7)',
  outro:   'rgba(96,165,250,0.7)',
  verse:   'rgba(52,211,153,0.7)',
  chorus:  'rgba(192,132,252,0.7)',
  bridge:  'rgba(251,146,60,0.7)',
  unknown: 'rgba(156,163,175,0.5)',
}

const DEFAULT_PLAYBACK_VOLUME = 0.3
let sharedPlaybackVolumeUi = DEFAULT_PLAYBACK_VOLUME
let sharedPlaybackMutedUi = false
const sharedMuteListeners = new Set<() => void>()
const sharedVolumeListeners = new Set<() => void>()

function subscribeSharedMute(cb: () => void) {
  sharedMuteListeners.add(cb)
  return () => { sharedMuteListeners.delete(cb) }
}

function subscribeSharedVolume(cb: () => void) {
  sharedVolumeListeners.add(cb)
  return () => { sharedVolumeListeners.delete(cb) }
}

function broadcastSharedVolumeUi() {
  for (const fn of sharedVolumeListeners) fn()
}

function setSharedPlaybackMuted(next: boolean) {
  sharedPlaybackMutedUi = next
  for (const fn of sharedMuteListeners) fn()
}

interface WaveformDisplayProps {
  audioFile: AudioFile
  currentTime?: number
  audioRef: RefObject<HTMLAudioElement | null>
  onSeek?: (time: number) => void
  playToolbar?:
    | React.ReactNode
    | ((playButtonEl: React.ReactNode, volumeSlot: React.ReactNode | null) => React.ReactNode)
  showPlaybackVolume?: boolean
  prefetchedBuffer?: AudioBuffer | null
  trimRange?: { startTime: number; endTime: number }
  onTrimRangeChange?: (range: { startTime: number; endTime: number }) => void
  trimFade?: {
    fadeIn: boolean
    fadeOut: boolean
    fadeInDuration: number
    fadeOutDuration: number
  }
  playbackEnvelope?: {
    range: { startTime: number; endTime: number }
    fade: {
      fadeIn: boolean
      fadeOut: boolean
      fadeInDuration: number
      fadeOutDuration: number
    }
  } | null
  playbackFadeEnvelope?: boolean
  markers?: SongMarker[]
  bottomSlot?: React.ReactNode
}

export function WaveformDisplay({
  audioFile,
  currentTime = 0,
  audioRef,
  onSeek,
  playToolbar,
  prefetchedBuffer = null,
  trimRange,
  onTrimRangeChange,
  trimFade,
  playbackEnvelope = null,
  playbackFadeEnvelope = true,
  showPlaybackVolume = true,
  markers,
  bottomSlot,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [trimDragging, setTrimDragging] = useState<'start' | 'end' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(DEFAULT_PLAYBACK_VOLUME)
  const [isMuted, setIsMuted] = useState(false)
  const [hoverSeek, setHoverSeek] = useState<{ pct: number; time: number } | null>(null)

  const trackUrl = audioFile.url

  useEffect(() => {
    setIsPlaying(false)
    setHoverSeek(null)
  }, [trackUrl])

  useEffect(() => {
    sharedPlaybackVolumeUi = DEFAULT_PLAYBACK_VOLUME
    setSharedPlaybackMuted(false)
    broadcastSharedVolumeUi()
    const a = audioRef.current
    if (a) {
      a.volume = DEFAULT_PLAYBACK_VOLUME
    }
  }, [trackUrl, audioRef])

  useEffect(() => {
    return subscribeSharedMute(() => setIsMuted(sharedPlaybackMutedUi))
  }, [])

  useEffect(() => {
    const sync = () => setVolume(sharedPlaybackVolumeUi)
    const unsub = subscribeSharedVolume(sync)
    sync()
    return unsub
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [trackUrl, audioRef])

  const applyFadeAwareVolume = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (sharedPlaybackMutedUi) {
      audio.volume = 0
      return
    }
    const base = sharedPlaybackVolumeUi
    const range = playbackEnvelope?.range ?? trimRange ?? null
    const fade = playbackEnvelope?.fade ?? trimFade ?? null
    if (range && fade && (fade.fadeIn || fade.fadeOut)) {
      const env = fadeEnvelopeMultiplier(audio.currentTime, range, fade)
      audio.volume = Math.min(1, base * env)
    } else {
      audio.volume = base
    }
  }, [trimRange, trimFade, playbackEnvelope, audioRef])

  useEffect(() => {
    applyFadeAwareVolume()
  }, [currentTime, isMuted, applyFadeAwareVolume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !playbackFadeEnvelope) return
    const range = playbackEnvelope?.range ?? trimRange ?? null
    const fade = playbackEnvelope?.fade ?? trimFade ?? null
    const hasFadeRamp = !!(range && fade && (fade.fadeIn || fade.fadeOut))
    const onSeeked = () => applyFadeAwareVolume()
    if (!hasFadeRamp) {
      applyFadeAwareVolume()
      audio.addEventListener('seeked', onSeeked)
      return () => audio.removeEventListener('seeked', onSeeked)
    }
    let rafId = 0
    const tick = () => {
      applyFadeAwareVolume()
      if (!audio.paused) rafId = requestAnimationFrame(tick)
    }
    const startTick = () => { cancelAnimationFrame(rafId); if (!audio.paused) rafId = requestAnimationFrame(tick) }
    const stopTick = () => { cancelAnimationFrame(rafId); applyFadeAwareVolume() }
    audio.addEventListener('playing', startTick)
    audio.addEventListener('pause', stopTick)
    audio.addEventListener('ended', stopTick)
    audio.addEventListener('seeked', onSeeked)
    if (!audio.paused) startTick()
    else applyFadeAwareVolume()
    return () => {
      cancelAnimationFrame(rafId)
      audio.removeEventListener('playing', startTick)
      audio.removeEventListener('pause', stopTick)
      audio.removeEventListener('ended', stopTick)
      audio.removeEventListener('seeked', onSeeked)
    }
  }, [playbackFadeEnvelope, playbackEnvelope, trimRange, trimFade, trackUrl, applyFadeAwareVolume, audioRef])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    sharedPlaybackVolumeUi = newVolume
    broadcastSharedVolumeUi()
    setSharedPlaybackMuted(newVolume === 0)
    applyFadeAwareVolume()
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    if (sharedPlaybackMutedUi) {
      const v = volume > 0 ? volume : DEFAULT_PLAYBACK_VOLUME
      sharedPlaybackVolumeUi = v
      broadcastSharedVolumeUi()
      setSharedPlaybackMuted(false)
      applyFadeAwareVolume()
    } else {
      setSharedPlaybackMuted(true)
      applyFadeAwareVolume()
    }
  }

  const drawFromBuffer = useCallback(() => {
    const canvas = canvasRef.current
    const buffer = bufferRef.current
    if (!canvas || !buffer) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    drawWaveform(canvas, buffer, false, trimRange ?? null, trimFade ?? null)

  }, [trimRange, trimFade])

  useEffect(() => {
    if (prefetchedBuffer) {
      bufferRef.current = prefetchedBuffer
      drawFromBuffer()
      return () => { bufferRef.current = null }
    }
    let cancelled = false
    const loadAudioData = async () => {
      const ac = new AudioContext()
      try {
        const response = await fetch(trackUrl)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await ac.decodeAudioData(arrayBuffer.slice(0))
        if (cancelled) return
        bufferRef.current = audioBuffer
        drawFromBuffer()
      } catch (error) {
        console.error('Failed to draw waveform:', error)
      } finally {
        void ac.close()
      }
    }
    void loadAudioData()
    return () => {
      cancelled = true
      bufferRef.current = null
    }
  }, [trackUrl, drawFromBuffer, prefetchedBuffer])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => { drawFromBuffer() })
    ro.observe(el)
    return () => ro.disconnect()
  }, [drawFromBuffer, trackUrl])

  const getDuration = useCallback((): number => {
    const a = audioRef.current
    if (a && Number.isFinite(a.duration) && a.duration > 0) return a.duration
    return audioFile.duration
  }, [audioFile.duration, audioRef])

  const seekToClientX = useCallback((clientX: number) => {
    const track = trackRef.current
    const audio = audioRef.current
    if (!track || !audio) return
    const r = track.getBoundingClientRect()
    if (r.width <= 0) return
    const duration = getDuration()
    if (duration <= 0) return
    const x = Math.max(0, Math.min(clientX - r.left, r.width))
    const t = (x / r.width) * duration
    audio.currentTime = t
    onSeek?.(t)
  }, [audioRef, getDuration, onSeek])

  const clientXToTime = useCallback((clientX: number): number | null => {
    const track = trackRef.current
    if (!track) return null
    const r = track.getBoundingClientRect()
    if (r.width <= 0) return null
    const duration = getDuration()
    if (duration <= 0) return null
    const x = Math.max(0, Math.min(clientX - r.left, r.width))
    return (x / r.width) * duration
  }, [getDuration])

  const applyTrimDrag = useCallback((clientX: number, edge: 'start' | 'end') => {
    if (!trimRange || !onTrimRangeChange) return
    const t = clientXToTime(clientX)
    if (t === null) return
    const duration = getDuration()
    if (duration <= 0) return
    if (edge === 'start') {
      const end = trimRange.endTime
      const start = Math.max(0, Math.min(t, end - MIN_TRIM_DURATION))
      onTrimRangeChange({ startTime: start, endTime: end })
      const audio = audioRef.current
      if (audio) audio.currentTime = start
      onSeek?.(start)
    } else {
      const start = trimRange.startTime
      const end = Math.min(duration, Math.max(t, start + MIN_TRIM_DURATION))
      onTrimRangeChange({ startTime: start, endTime: end })
    }
  }, [audioRef, clientXToTime, getDuration, onSeek, onTrimRangeChange, trimRange])

  const bumpTrimEdge = useCallback((edge: 'start' | 'end', deltaSec: number) => {
    if (!trimRange || !onTrimRangeChange || deltaSec === 0) return
    const duration = getDuration()
    if (duration <= 0) return
    if (edge === 'start') {
      const maxStart = trimRange.endTime - MIN_TRIM_DURATION
      const start = Math.max(0, Math.min(maxStart, trimRange.startTime + deltaSec))
      onTrimRangeChange({ startTime: start, endTime: trimRange.endTime })
      const audio = audioRef.current
      if (audio) audio.currentTime = start
      onSeek?.(start)
    } else {
      const minEnd = trimRange.startTime + MIN_TRIM_DURATION
      const end = Math.max(minEnd, Math.min(duration, trimRange.endTime + deltaSec))
      onTrimRangeChange({ startTime: trimRange.startTime, endTime: end })
    }
  }, [audioRef, getDuration, onSeek, onTrimRangeChange, trimRange])

  const trimHandleKeyDown = useCallback((edge: 'start' | 'end') => (e: React.KeyboardEvent) => {
    const decrease = e.key === 'ArrowLeft' || e.key === 'ArrowDown'
    const increase = e.key === 'ArrowRight' || e.key === 'ArrowUp'
    if (!decrease && !increase) return
    e.preventDefault()
    e.stopPropagation()
    const step = e.shiftKey ? 5 : 1
    const delta = decrease ? -step : step
    bumpTrimEdge(edge, delta)
  }, [bumpTrimEdge])

  const onTrimHandlePointerDown = (edge: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setTrimDragging(edge)
    applyTrimDrag(e.clientX, edge)
  }

  const onTrimHandlePointerMove = (edge: 'start' | 'end') => (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.stopPropagation()
    applyTrimDrag(e.clientX, edge)
  }

  const onTrimHandlePointerUp = (edge: 'start' | 'end') => (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (edge === 'start') {
      const a = audioRef.current
      if (a) void a.play().catch(() => {})
    }
    setTrimDragging(null)
  }

  const onTrackMouseMove = (e: React.MouseEvent) => {
    const track = trackRef.current
    if (!track) return
    const r = track.getBoundingClientRect()
    if (r.width <= 0) return
    const duration = getDuration()
    if (duration <= 0) return
    const x = Math.max(0, Math.min(e.clientX - r.left, r.width))
    setHoverSeek({ pct: (x / r.width) * 100, time: (x / r.width) * duration })
  }

  const onTrackMouseLeave = () => setHoverSeek(null)

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsScrubbing(true)
    seekToClientX(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    seekToClientX(e.clientX)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setIsScrubbing(false)
  }

  const displayDuration = getDuration()
  const playheadPct = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0

  const showTrimHandles =
    trimRange && onTrimRangeChange && displayDuration > 0 &&
    Number.isFinite(trimRange.startTime) && Number.isFinite(trimRange.endTime)

  const trimStartPct = showTrimHandles
    ? Math.max(0, Math.min(100, (trimRange!.startTime / displayDuration) * 100))
    : 0
  const trimEndPct = showTrimHandles
    ? Math.max(0, Math.min(100, (trimRange!.endTime / displayDuration) * 100))
    : 100
  const trimTailPct = showTrimHandles ? Math.max(0, 100 - trimEndPct) : 0

  const playButton = (
    <button
      type="button"
      onClick={togglePlayPause}
      className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-80"
      style={{ width: 56, height: 56, borderRadius: '50%', background: '#2DD4BF', border: 'none', cursor: 'pointer', boxShadow: '0 0 14px rgba(45,212,191,.4)' }}
      aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
    >
      {isPlaying ? (
        <svg width="14" height="14" viewBox="0 0 10 10" aria-hidden><rect x="1" y="0" width="3" height="10" fill="#06231f" /><rect x="6" y="0" width="3" height="10" fill="#06231f" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden><path d="M3 1l11 7-11 7z" fill="#06231f" /></svg>
      )}
    </button>
  )

  const volumeUi = showPlaybackVolume !== false ? (
    <div className="flex items-center gap-[10px] shrink-0">
      <button
        type="button"
        onClick={toggleMute}
        className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-70"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
      >
        {isMuted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#8a8a8a" />
            <line x1="18" y1="9" x2="23" y2="15" stroke="#8a8a8a" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="23" y1="9" x2="18" y2="15" stroke="#8a8a8a" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#8a8a8a" />
            <path d="M16 8c1.5 1.5 1.5 6.5 0 8" stroke="#8a8a8a" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <input
        type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
        onChange={handleVolumeChange}
        style={{ background: 'rgba(255,255,255,.12)' }}
        className="h-1 w-[84px] flex-none rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2DD4BF] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#2DD4BF] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  ) : null

  const useInlineVolume = volumeUi != null && typeof playToolbar === 'function'

  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 py-5 shadow-sm">
      {!useInlineVolume && volumeUi != null && (
        <div className="px-4 pb-2 flex flex-wrap items-center justify-start gap-x-3 gap-y-2">
          {volumeUi}
        </div>
      )}

      <div ref={containerRef} className="relative px-4">
        <div className="relative h-[380px] w-full overflow-hidden ring-1 ring-inset ring-black/25 bg-[#0b1622] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl">
          <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full select-none" aria-hidden />

          {markers && markers.map((marker, i) => (
            <div
              key={i}
              className="pointer-events-none absolute inset-y-0 z-[5] w-px"
              style={{ left: `${(marker.start / audioFile.duration) * 100}%`, backgroundColor: MARKER_LINE_COLORS[marker.type] }}
              aria-hidden
            />
          ))}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-1.5 z-[6] flex justify-between px-2 font-mono text-[11px] tabular-nums text-white/55"
            aria-hidden
          >
            <span>{formatTimeDetailedComma(0)}</span>
            <span>{formatTimeDetailedComma(displayDuration || audioFile.duration)}</span>
          </div>

          {showTrimHandles && (
            <div className="pointer-events-none absolute inset-0 z-[8] rounded-[inherit]" aria-hidden>
              <div className="absolute inset-y-0 left-0 bg-black/35" style={{ width: `${trimStartPct}%` }} />
              <div className="absolute inset-y-0 bg-black/35" style={{ left: `${trimEndPct}%`, width: `${trimTailPct}%` }} />
              <div
                className="absolute inset-y-0 border-l-2 border-r-2 border-amber-400/80 bg-amber-400/10"
                style={{ left: `${trimStartPct}%`, width: `${Math.max(trimEndPct - trimStartPct, 0.08)}%` }}
              />
            </div>
          )}

          <div
            ref={trackRef}
            className={[
              'absolute inset-0 z-10 rounded-[inherit] touch-none',
              trimDragging ? 'cursor-ew-resize' : isScrubbing ? 'cursor-grabbing' : 'cursor-grab',
            ].join(' ')}
            onMouseMove={onTrackMouseMove}
            onMouseLeave={onTrackMouseLeave}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={displayDuration}
            aria-valuenow={currentTime}
            aria-label="Позиция воспроизведения, перетащите для перемотки"
            onKeyDown={(e) => {
              const d = getDuration()
              if (d <= 0) return
              const step = e.shiftKey ? 5 : 1
              const audio = audioRef.current
              if (!audio) return
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault()
                const t = Math.max(0, audio.currentTime - step)
                audio.currentTime = t
                onSeek?.(t)
              }
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault()
                const t = Math.min(d, audio.currentTime + step)
                audio.currentTime = t
                onSeek?.(t)
              }
            }}
          >
            {showTrimHandles && (
              <>
                <div
                  role="slider"
                  tabIndex={0}
                  aria-orientation="horizontal"
                  aria-label="Начало фрагмента"
                  aria-valuemin={0}
                  aria-valuemax={trimRange!.endTime - MIN_TRIM_DURATION}
                  aria-valuenow={trimRange!.startTime}
                  className="absolute inset-y-0 z-[20] w-[15px] cursor-ew-resize touch-none select-none rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-0"
                  style={{ left: `${trimStartPct}%`, marginLeft: '-7.5px' }}
                  onPointerDown={onTrimHandlePointerDown('start')}
                  onPointerMove={onTrimHandlePointerMove('start')}
                  onPointerUp={onTrimHandlePointerUp('start')}
                  onPointerCancel={onTrimHandlePointerUp('start')}
                  onKeyDown={trimHandleKeyDown('start')}
                >
                  <div
                    className={['pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2', trimDragging === 'start' ? 'bg-amber-300' : 'bg-amber-400'].join(' ')}
                    style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.35)' }}
                  />
                  <div
                    className={['pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[50px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-sm shadow-md', trimDragging === 'start' ? 'bg-amber-300' : 'bg-amber-400'].join(' ')}
                    style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.35)' }}
                  />
                  <div className="absolute top-2 left-1/2 z-[11] -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-900 bg-amber-400 whitespace-nowrap shadow pointer-events-none">
                    {formatTimeDetailed(trimRange!.startTime)}
                  </div>
                </div>
                <div
                  role="slider"
                  tabIndex={0}
                  aria-orientation="horizontal"
                  aria-label="Конец фрагмента"
                  aria-valuemin={trimRange!.startTime + MIN_TRIM_DURATION}
                  aria-valuemax={displayDuration}
                  aria-valuenow={trimRange!.endTime}
                  className="absolute inset-y-0 z-[20] w-[15px] cursor-ew-resize touch-none select-none rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-0"
                  style={{ left: `${trimEndPct}%`, marginLeft: '-7.5px' }}
                  onPointerDown={onTrimHandlePointerDown('end')}
                  onPointerMove={onTrimHandlePointerMove('end')}
                  onPointerUp={onTrimHandlePointerUp('end')}
                  onPointerCancel={onTrimHandlePointerUp('end')}
                  onKeyDown={trimHandleKeyDown('end')}
                >
                  <div
                    className={['pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2', trimDragging === 'end' ? 'bg-amber-300' : 'bg-amber-400'].join(' ')}
                    style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.35)' }}
                  />
                  <div
                    className={['pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[50px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-sm shadow-md', trimDragging === 'end' ? 'bg-amber-300' : 'bg-amber-400'].join(' ')}
                    style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.35)' }}
                  />
                  <div className="absolute top-2 left-1/2 z-[11] -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-900 bg-amber-400 whitespace-nowrap shadow pointer-events-none">
                    {formatTimeDetailed(trimRange!.endTime)}
                  </div>
                </div>
              </>
            )}

            {hoverSeek && displayDuration > 0 && !isScrubbing && (
              <div
                className="absolute top-0 bottom-0 z-[16] w-0 pointer-events-none"
                style={{ left: `${hoverSeek.pct}%`, transform: 'translateX(-50%)' }}
                aria-hidden
              >
                <div className="absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded border border-sky-400/35 bg-[#061018]/94 px-1.5 py-0.5 font-mono text-[10px] text-sky-200/95 shadow tabular-nums whitespace-nowrap">
                  {formatTimeDetailedComma(hoverSeek.time)}
                </div>
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-sky-300/90" style={{ boxShadow: '0 0 6px rgba(56,189,248,0.5)' }} />
              </div>
            )}

            {displayDuration > 0 && (
              <div
                className="absolute top-0 bottom-0 z-[21] w-0.5 pointer-events-none"
                style={{ left: `${playheadPct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded border border-white/10 bg-[#061018]/95 px-1.5 py-0.5 font-mono text-[10px] text-[#7dd3c9] shadow">
                  {formatTimeDetailedComma(currentTime)}
                </div>
                <div
                  className="h-full w-full rounded-[1px] bg-white"
                  style={{ outline: '1px solid rgb(15 23 42)', outlineOffset: 0, boxShadow: '0 0 4px rgba(255,255,255,0.35)' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {bottomSlot && (
        <div className="px-4 pt-2">
          {bottomSlot}
        </div>
      )}

      {playToolbar ? (
        typeof playToolbar === 'function' ? (
          <div className="px-4 pb-3 w-full flex justify-center min-w-0">
            {(playToolbar as (pb: React.ReactNode, vol: React.ReactNode | null) => React.ReactNode)(
              playButton,
              useInlineVolume ? volumeUi : null,
            )}
          </div>
        ) : (
          <div className="px-4 pb-3 flex flex-col items-center gap-3 sm:gap-4">
            {playButton}
            <div className="w-full flex justify-center min-w-0">{playToolbar}</div>
          </div>
        )
      ) : (
        <div className="px-4 pb-3 flex justify-center">{playButton}</div>
      )}
    </div>
  )
}
