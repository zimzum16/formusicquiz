import { useState, useCallback, useRef } from 'react'
import type { AudioFile, TrimSegment, ProcessedAudioFile } from '../types/audio'
import { processAudioSegment } from '../lib/audioUtils'
import { extractID3Tags, parseFilename } from '../lib/id3Parser'
import { tracksApi } from '../lib/api'
import { analyzeSongStructure, type SongMarker } from '../lib/songStructure'

export function useAudioEditor() {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null)
  const [segments, setSegments] = useState<TrimSegment[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFiles, setProcessedFiles] = useState<ProcessedAudioFile[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sharedDecodedBuffer, setSharedDecodedBuffer] = useState<AudioBuffer | null>(null)
  const [songMarkers, setSongMarkers] = useState<SongMarker[]>([])
  const [isAnalyzingStructure, setIsAnalyzingStructure] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null)
    setUploadProgress(0)

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setError('Поддерживается только формат MP3')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Размер файла не должен превышать 50 МБ')
      return
    }

    try {
      setUploadProgress(30)

      const url = URL.createObjectURL(file)
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      await audioContext.resume()

      setUploadProgress(50)

      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
      setSharedDecodedBuffer(audioBuffer)

      setUploadProgress(70)

      const id3Tags = await extractID3Tags(file)

      setUploadProgress(85)

      let artist = id3Tags.artist
      let title = id3Tags.title

      if (!artist || !title) {
        const parsed = parseFilename(file.name)
        artist = artist || parsed.artist || 'Неизвестный исполнитель'
        title = title || parsed.title || file.name.replace('.mp3', '')
      }

      setUploadProgress(100)

      setAudioFile({
        file,
        url,
        duration: audioBuffer.duration,
        artist,
        title,
        coverArt: id3Tags.coverArt,
        album: id3Tags.album,
        year: id3Tags.year,
        genre: id3Tags.genre,
      })

      // Анализ структуры — сразу, не ждём Spotify/Genius
      setIsAnalyzingStructure(true)
      analyzeSongStructure(title, artist, audioBuffer.duration)
        .then(setSongMarkers)
        .finally(() => setIsAnalyzingStructure(false))

      // Фоновое обогащение из Spotify + Genius — не блокирует UI
      void (async () => {
        try {
          const results = await tracksApi.search(title, artist)
          if (!results.length) return
          const match = results[0]
          const year = match.release_date?.slice(0, 4) ?? undefined

          setAudioFile(prev => prev ? {
            ...prev,
            coverArt: match.cover_url ?? prev.coverArt,
            album: match.album || prev.album,
            year: year || prev.year,
          } : prev)

          const info = await tracksApi.getInfo(match.id)
          const geniusUrl = info.genius?.lyrics_url ?? undefined
          if (geniusUrl) {
            setAudioFile(prev => prev ? { ...prev, geniusUrl } : prev)
          }
        } catch {
          // Тихая ошибка — данные из ID3 остаются
        }
      })()

      const defaultSegment: TrimSegment = {
        id: crypto.randomUUID(),
        startTime: 0,
        endTime: audioBuffer.duration,
        fadeIn: false,
        fadeOut: false,
        fadeInDuration: 1,
        fadeOutDuration: 1,
      }

      setSegments([defaultSegment])
      setProcessedFiles([])
    } catch (err) {
      setError('Ошибка при загрузке файла. Убедитесь, что это корректный MP3 файл.')
      console.error('File upload error:', err)
      setUploadProgress(0)
    }
  }, [])

  const addSegment = useCallback(() => {
    if (!audioFile) return
    const newSeg: TrimSegment = {
      id: crypto.randomUUID(),
      startTime: 0,
      endTime: audioFile.duration,
      fadeIn: false,
      fadeOut: false,
      fadeInDuration: 1,
      fadeOutDuration: 1,
    }
    setSegments(prev => [...prev, newSeg])
  }, [audioFile])

  const removeSegment = useCallback((id: string) => {
    setSegments(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(s => s.id !== id)
    })
  }, [])

  const updateSegment = useCallback((id: string, updates: Partial<TrimSegment>) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  const processAudio = useCallback(async () => {
    if (!audioFile || segments.length === 0 || !sharedDecodedBuffer) {
      setError('Аудиоданные недоступны. Загрузите файл ещё раз.')
      return
    }

    setIsProcessing(true)
    setProcessedFiles([])
    setError(null)

    try {
      const processed: ProcessedAudioFile[] = []
      for (let i = 0; i < segments.length; i++) {
        const result = await processAudioSegment(
          sharedDecodedBuffer,
          segments[i],
          audioFile.artist,
          audioFile.title,
          i + 1
        )
        processed.push(result)
      }
      setProcessedFiles(processed)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setError(`Ошибка при обработке аудио: ${detail}`)
    } finally {
      setIsProcessing(false)
    }
  }, [audioFile, segments, sharedDecodedBuffer])

  const reset = useCallback(() => {
    if (audioFile?.url) URL.revokeObjectURL(audioFile.url)
    processedFiles.forEach(f => URL.revokeObjectURL(f.url))
    setAudioFile(null)
    setSegments([])
    setSharedDecodedBuffer(null)
    setProcessedFiles([])
    setUploadProgress(0)
    setError(null)
    setSongMarkers([])
    setIsAnalyzingStructure(false)
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [audioFile, processedFiles])

  return {
    audioFile,
    segments,
    sharedDecodedBuffer,
    isProcessing,
    processedFiles,
    uploadProgress,
    error,
    songMarkers,
    isAnalyzingStructure,
    handleFileUpload,
    addSegment,
    removeSegment,
    updateSegment,
    processAudio,
    reset,
  }
}
