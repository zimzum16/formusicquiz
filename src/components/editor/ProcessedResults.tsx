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

  useEffect(() => {
    const init: Record<string, AudioPlayerState> = {}
    files.forEach((f) => { init[f.id] = { ...DEFAULT_STATE } })
    setStates(init)
  }, [files])

  const get = (id: string): AudioPlayerState => states[id] ?? DEFAULT_STATE

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
      <div className="grid gap-[14px]" style={{ gridTemplateColumns: `repeat(${Math.min(files.length, 2)}, 1fr)` }}>
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
              <div className="flex items-center gap-[10px] mb-[14px]">
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

                <div className="flex-1 relative" style={{ height: '3px', borderRadius: '3px', background: 'rgba(255,255,255,.12)', cursor: 'pointer' }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const ratio = (e.clientX - rect.left) / rect.width
                    handleSeek(file.id, ratio * file.duration)
                  }}
                >
                  <div style={{ width: `${progress}%`, height: '100%', borderRadius: '3px', background: '#2DD4BF', transition: 'width .1s linear' }} />
                </div>

                <span className="shrink-0 text-[12px]" style={{ color: '#8a8a8a', ...MONO }}>
                  {fmt(file.duration)}
                </span>
              </div>

              {/* Download single */}
              <button
                type="button"
                onClick={() => download(file)}
                className="w-full text-white transition-opacity hover:opacity-70"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,.12)',
                  borderRadius: '980px',
                  padding: '9px',
                  fontWeight: 700,
                  fontSize: '12px',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  ...SANS,
                }}
              >
                ↓ Скачать
              </button>
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
