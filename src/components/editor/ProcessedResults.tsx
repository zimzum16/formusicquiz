import { useRef, useState, useEffect } from 'react'
import type { ProcessedAudioFile } from '../../types/audio'

interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
}

const DEFAULT_STATE: AudioPlayerState = { isPlaying: false, currentTime: 0 }

const SANS: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif' }
const MONO: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

interface ProcessedResultsProps {
  files: ProcessedAudioFile[]
}

export function ProcessedResults({ files }: ProcessedResultsProps) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const [states, setStates] = useState<Record<string, AudioPlayerState>>({})
  const statesRef = useRef(states)
  statesRef.current = states
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const init: Record<string, AudioPlayerState> = {}
    files.forEach((f) => { init[f.id] = { ...DEFAULT_STATE } })
    setStates(init)
  }, [files])

  const get = (id: string): AudioPlayerState => states[id] ?? DEFAULT_STATE
  const getVol = (id: string) => volumes[id] ?? 0.3
  const getMuted = (id: string) => mutedStates[id] ?? false

  const applyVolume = (id: string, muted: boolean, vol: number) => {
    const audio = audioRefs.current[id]
    if (audio) audio.volume = muted ? 0 : vol
  }

  const handleVolumeChange = (id: string, val: number) => {
    const muted = val === 0
    setVolumes(prev => ({ ...prev, [id]: val }))
    setMutedStates(prev => ({ ...prev, [id]: muted }))
    applyVolume(id, muted, val)
  }

  const toggleMute = (id: string) => {
    const muted = getMuted(id)
    const vol = getVol(id)
    const newMuted = !muted
    setMutedStates(prev => ({ ...prev, [id]: newMuted }))
    applyVolume(id, newMuted, vol > 0 ? vol : 0.8)
  }

  const togglePlay = (id: string) => {
    const audio = audioRefs.current[id]
    if (!audio) return
    const cur = get(id)
    if (cur.isPlaying) {
      audio.pause()
      setStates(prev => ({ ...prev, [id]: { ...get(id), isPlaying: false } }))
    } else {
      Object.entries(audioRefs.current).forEach(([otherId, el]) => {
        if (otherId !== id && el) {
          el.pause()
          setStates(prev => ({ ...prev, [otherId]: { ...statesRef.current[otherId] ?? DEFAULT_STATE, isPlaying: false } }))
        }
      })
      audio.volume = getMuted(id) ? 0 : getVol(id)
      void audio.play()
      setStates(prev => ({ ...prev, [id]: { ...get(id), isPlaying: true } }))
    }
  }

  const handleTimeUpdate = (id: string) => {
    const audio = audioRefs.current[id]
    if (!audio) return
    setStates(prev => ({ ...prev, [id]: { ...statesRef.current[id] ?? DEFAULT_STATE, currentTime: audio.currentTime } }))
  }

  const handleSeek = (id: string, val: number) => {
    const audio = audioRefs.current[id]
    if (!audio) return
    audio.currentTime = val
    setStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_STATE), currentTime: val } }))
  }

  const download = (file: ProcessedAudioFile) => {
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.name
    a.click()
  }

  const downloadAll = () => {
    files.forEach((f, i) => window.setTimeout(() => download(f), i * 450))
  }

  return (
    <div
      className="rounded-[20px] border"
      style={{
        padding: '24px 28px',
        background: 'rgba(24,24,28,.78)',
        backdropFilter: 'saturate(180%) blur(24px)',
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), 0 12px 40px rgba(0,0,0,.55)',
        borderColor: 'rgba(45,212,191,.25)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-[18px]" style={{ color: '#2DD4BF', fontWeight: 800, fontSize: '15px', ...SANS }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline points="20,6 9,17 4,12" stroke="#2DD4BF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Готово
      </div>

      {/* File cards grid */}
      <div className={`grid gap-[14px] grid-cols-1 ${files.length >= 2 ? 'sm:grid-cols-2' : ''}`}>
        {files.map((file) => {
          const st = get(file.id)
          const progress = file.duration > 0 ? (st.currentTime / file.duration) * 100 : 0

          return (
            <div
              key={file.id}
              style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
            >
              <audio
                ref={(el) => { audioRefs.current[file.id] = el }}
                src={file.url}
                onTimeUpdate={() => handleTimeUpdate(file.id)}
                onEnded={() => setStates(prev => ({ ...prev, [file.id]: { ...(prev[file.id] ?? DEFAULT_STATE), isPlaying: false, currentTime: 0 } }))}
                preload="metadata"
              />

              <div className="text-[14px] font-bold text-white mb-[3px] truncate" style={SANS}>
                {file.name}
              </div>
              <div className="mb-[12px] text-[11px] font-bold uppercase tracking-[.09em]" style={{ color: '#8a8a8a', ...SANS }}>
                Длительность: {fmt(file.duration)}
              </div>

              {/* Mini player */}
              <div className="flex items-center gap-[8px] mb-[14px]">
                <button
                  type="button"
                  onClick={() => togglePlay(file.id)}
                  className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-80"
                  style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#2DD4BF', border: 'none', cursor: 'pointer', boxShadow: '0 0 12px rgba(45,212,191,.4)' }}
                  aria-label={st.isPlaying ? 'Пауза' : 'Воспроизвести'}
                >
                  {st.isPlaying ? (
                    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden><rect x="1" y="0" width="3" height="10" fill="#06231f" /><rect x="6" y="0" width="3" height="10" fill="#06231f" /></svg>
                  ) : (
                    <svg width="9" height="9" viewBox="0 0 16 16" aria-hidden><path d="M3 1l11 7-11 7z" fill="#06231f" /></svg>
                  )}
                </button>

                <div className="flex-1 min-w-0 flex items-center gap-[8px]">
                  <div className="w-4/5 relative" style={{ height: '3px', borderRadius: '3px', background: 'rgba(255,255,255,.12)', cursor: 'pointer' }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const ratio = (e.clientX - rect.left) / rect.width
                      handleSeek(file.id, ratio * file.duration)
                    }}
                  >
                    <div style={{ width: `${progress}%`, height: '100%', borderRadius: '3px', background: '#2DD4BF', transition: 'width .1s linear' }} />
                  </div>
                  <span className="shrink-0 text-[11px]" style={{ color: '#8a8a8a', ...MONO }}>
                    {fmt(file.duration)}
                  </span>
                </div>

                {/* Volume */}
                <div className="flex shrink-0 items-center gap-[6px]">
                  <button
                    type="button"
                    onClick={() => toggleMute(file.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    aria-label={getMuted(file.id) ? 'Включить звук' : 'Выключить звук'}
                  >
                    {getMuted(file.id) ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#8a8a8a" />
                        <line x1="18" y1="9" x2="23" y2="15" stroke="#8a8a8a" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="23" y1="9" x2="18" y2="15" stroke="#8a8a8a" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#8a8a8a" />
                        <path d="M16 8c1.5 1.5 1.5 6.5 0 8" stroke="#8a8a8a" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={getMuted(file.id) ? 0 : getVol(file.id)}
                    onChange={(e) => handleVolumeChange(file.id, parseFloat(e.target.value))}
                    style={{ background: 'rgba(255,255,255,.12)' }}
                    className="h-1 w-[52px] flex-none rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2DD4BF] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#2DD4BF] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* Download all */}
      <div className="flex justify-center mt-[20px]">
        <button
          type="button"
          onClick={downloadAll}
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
          style={{
            background: '#2DD4BF',
            color: '#06231f',
            border: 'none',
            borderRadius: '980px',
            padding: '13px 32px',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(45,212,191,.25)',
            ...SANS,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#06231f" strokeWidth="2" strokeLinecap="round" />
            <polyline points="7,10 12,15 17,10" stroke="#06231f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="15" x2="12" y2="3" stroke="#06231f" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {files.length >= 2 ? 'Скачать файлы' : 'Скачать файл'}
        </button>
      </div>
    </div>
  )
}
