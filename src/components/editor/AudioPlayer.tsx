import { useEffect, forwardRef } from 'react'
import type { AudioFile } from '../../types/audio'

interface AudioPlayerProps {
  audioFile: AudioFile
  onTimeUpdate?: (currentTime: number) => void
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(function AudioPlayer(
  { audioFile, onTimeUpdate },
  audioRef
) {
  useEffect(() => {
    const audio = (audioRef as React.RefObject<HTMLAudioElement | null>).current
    if (!audio) return
    const handler = () => onTimeUpdate?.(audio.currentTime)
    audio.addEventListener('timeupdate', handler)
    return () => audio.removeEventListener('timeupdate', handler)
  }, [onTimeUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const srcKey = audioFile.url
  useEffect(() => {
    const audio = (audioRef as React.RefObject<HTMLAudioElement | null>).current
    if (audio) {
      audio.currentTime = 0
      audio.pause()
      onTimeUpdate?.(0)
    }
  }, [srcKey, onTimeUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  return <audio ref={audioRef} src={audioFile.url} preload="metadata" />
})
