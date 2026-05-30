import { useRef, useState, useEffect } from 'react'
import type { ProcessedAudioFile } from '../../types/audio'
import { Download, Music, Play, Pause, Volume2, VolumeX } from 'lucide-react'

interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  volume: number
  isMuted: boolean
}

const DEFAULT_AUDIO_STATE: AudioPlayerState = {
  isPlaying: false,
  currentTime: 0,
  volume: 0.3,
  isMuted: false,
}

function mergeFileState(
  prev: { [key: string]: AudioPlayerState } | undefined,
  fileId: string
): AudioPlayerState {
  return { ...DEFAULT_AUDIO_STATE, ...prev?.[fileId] }
}

interface ProcessedResultsProps {
  files: ProcessedAudioFile[]
}

export function ProcessedResults({ files }: ProcessedResultsProps) {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})
  const [audioStates, setAudioStates] = useState<{ [key: string]: AudioPlayerState }>({})
  const audioStatesRef = useRef(audioStates)
  audioStatesRef.current = audioStates

  useEffect(() => {
    const initialStates: { [key: string]: AudioPlayerState } = {}
    files.forEach((file) => {
      initialStates[file.id] = { ...DEFAULT_AUDIO_STATE }
    })
    setAudioStates(initialStates)
  }, [files])

  const handleDownload = (file: ProcessedAudioFile) => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.click()
  }

  const togglePlayPause = (fileId: string) => {
    const audio = audioRefs.current[fileId]
    if (!audio) return
    const current = mergeFileState(audioStates, fileId)
    if (current.isPlaying) {
      audio.pause()
    } else {
      Object.keys(audioRefs.current).forEach((id) => {
        if (id !== fileId && audioRefs.current[id]) {
          audioRefs.current[id]!.pause()
          setAudioStates((prev) => {
            const b = mergeFileState(prev, id)
            return { ...prev, [id]: { ...b, isPlaying: false } }
          })
        }
      })
      void audio.play()
    }
    setAudioStates((prev) => {
      const b = mergeFileState(prev, fileId)
      return { ...prev, [fileId]: { ...b, isPlaying: !b.isPlaying } }
    })
  }

  const handleTimeUpdate = (fileId: string) => {
    const audio = audioRefs.current[fileId]
    if (!audio) return
    setAudioStates((prev) => {
      const b = mergeFileState(prev, fileId)
      return { ...prev, [fileId]: { ...b, currentTime: audio.currentTime } }
    })
  }

  const handleSeek = (fileId: string, value: number) => {
    const audio = audioRefs.current[fileId]
    if (!audio) return
    audio.currentTime = value
    setAudioStates((prev) => {
      const b = mergeFileState(prev, fileId)
      return { ...prev, [fileId]: { ...b, currentTime: value } }
    })
  }

  const handleVolumeChange = (fileId: string, value: number) => {
    const audio = audioRefs.current[fileId]
    if (!audio) return
    audio.volume = value
    setAudioStates((prev) => {
      const b = mergeFileState(prev, fileId)
      return { ...prev, [fileId]: { ...b, volume: value, isMuted: value === 0 } }
    })
  }

  const toggleMute = (fileId: string) => {
    const audio = audioRefs.current[fileId]
    if (!audio) return
    const currentState = mergeFileState(audioStates, fileId)
    if (currentState.isMuted) {
      const v = currentState.volume > 0 ? currentState.volume : DEFAULT_AUDIO_STATE.volume
      audio.volume = v
      setAudioStates((prev) => {
        const b = mergeFileState(prev, fileId)
        return { ...prev, [fileId]: { ...b, isMuted: false, volume: v } }
      })
    } else {
      audio.volume = 0
      setAudioStates((prev) => {
        const b = mergeFileState(prev, fileId)
        return { ...prev, [fileId]: { ...b, isMuted: true } }
      })
    }
  }

  const handleDownloadAll = () => {
    files.forEach((file, i) => {
      window.setTimeout(() => handleDownload(file), i * 450)
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const downloadLabel = files.length >= 2 ? 'Скачать файлы' : 'Скачать файл'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 space-y-4">
        <div className="flex items-center gap-2">
          <Music size={24} className="text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-medium text-green-900 dark:text-green-100">Готово</h3>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          {files.map((file) => {
            const state = mergeFileState(audioStates, file.id)
            return (
              <div
                key={file.id}
                className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-green-200 dark:border-green-800 space-y-4 sm:min-w-0 sm:flex-1"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate min-w-0 flex-1">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleMute(file.id)}
                        className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        aria-label={state.isMuted ? 'Включить звук' : 'Выключить звук'}
                      >
                        {state.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <input
                        type="range" min="0" max="1" step="0.01"
                        value={state.isMuted ? 0 : (Number.isFinite(state.volume) ? state.volume : DEFAULT_AUDIO_STATE.volume)}
                        onChange={(e) => handleVolumeChange(file.id, parseFloat(e.target.value))}
                        className="h-1.5 w-12 flex-none bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Длительность: {Math.floor(file.duration / 60)}:{String(Math.floor(file.duration % 60)).padStart(2, '0')}
                  </p>
                </div>

                <div className="space-y-2">
                  <audio
                    ref={(el) => { audioRefs.current[file.id] = el }}
                    src={file.url}
                    onLoadedMetadata={(e) => {
                      const a = e.currentTarget
                      const s = mergeFileState(audioStatesRef.current, file.id)
                      a.volume = s.isMuted ? 0 : s.volume
                    }}
                    onTimeUpdate={() => handleTimeUpdate(file.id)}
                    onEnded={() =>
                      setAudioStates((prev) => {
                        const b = mergeFileState(prev, file.id)
                        return { ...prev, [file.id]: { ...b, isPlaying: false, currentTime: 0 } }
                      })
                    }
                    preload="metadata"
                  />

                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => togglePlayPause(file.id)}
                      className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-sm"
                      aria-label={state.isPlaying ? 'Пауза' : 'Воспроизвести'}
                    >
                      {state.isPlaying
                        ? <Pause size={18} fill="currentColor" />
                        : <Play size={18} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        type="range" min="0" max={file.duration} step="0.1" value={state.currentTime}
                        onChange={(e) => handleSeek(file.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                        <span>{formatTime(state.currentTime)}</span>
                        <span>{formatTime(file.duration)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors text-sm"
                >
                  <Download size={14} />
                  Скачать
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {files.length >= 2 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleDownloadAll}
            className="flex shrink-0 items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-sm"
          >
            <Download size={18} className="shrink-0" strokeWidth={2} aria-hidden />
            <span className="text-sm">{downloadLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}
