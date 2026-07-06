import { useState, useCallback, useRef } from 'react'
import type { AudioFile, TrimSegment, ProcessedAudioFile } from '../types/audio'
import { processAudioSegment } from '../lib/audioUtils'
import { extractID3Tags, parseFilename } from '../lib/id3Parser'
import { tracksApi } from '../lib/api'
import { analyzeSongStructure, type SongMarker, type SongAnalysis } from '../lib/songStructure'

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

      // Анализ структуры и Spotify запускаем параллельно
      const hasId3Tags = !!(id3Tags.artist && id3Tags.title)
      setIsAnalyzingStructure(true)
      analyzeSongStructure(title, artist, audioBuffer.duration, (gTitle, gArtist) => {
        // Обновляем title/artist из Genius только если ID3-тегов не было —
        // иначе Genius-каноническое имя перезапишет корректные теги другим форматом
        if (!hasId3Tags && (gTitle !== title || gArtist !== artist)) {
          setAudioFile(prev => prev ? { ...prev, title: gTitle, artist: gArtist } : prev)
        }
      })
        .then((analysis: SongAnalysis) => { setSongMarkers(analysis.markers) })
        .finally(() => setIsAnalyzingStructure(false))

      // Фоновое обогащение из Spotify — только обложка, альбом, год
      void (async () => {
        try {
          const results = await tracksApi.search(title, artist)
          if (!results.length) return

          const normalize = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '')

          const findArtistMatches = (res: typeof results, artistName: string) =>
            res.filter(r => {
              const rNorm = normalize(r.artist)
              const aNorm = normalize(artistName)
              return rNorm.includes(aNorm) || aNorm.includes(rNorm)
            })

          let artistMatches = findArtistMatches(results, artist)
          let resolvedTitle = title
          let resolvedArtist = artist

          // Если совпадений нет и теги не были в файле — порядок в имени файла может быть
          // "Title - Artist" вместо "Artist - Title". Пробуем поменять местами.
          if (!artistMatches.length && !id3Tags.artist && !id3Tags.title) {
            const swappedResults = await tracksApi.search(artist, title)
            const swappedMatches = findArtistMatches(swappedResults, title)
            if (swappedMatches.length) {
              artistMatches = swappedMatches
              resolvedTitle = artist   // первая часть имени файла оказалась тайтлом
              resolvedArtist = title   // вторая — артистом
              setAudioFile(prev => prev ? { ...prev, title: resolvedTitle, artist: resolvedArtist } : prev)
            }
          }

          // Фолбэк: исполнитель мог быть в другой раскладке (кириллица в ID3 vs латиница в Spotify).
          // Ищем хотя бы по совпадению названия трека.
          if (!artistMatches.length) {
            const titleNorm = normalize(resolvedTitle)
            const byTitle = results.find(r => {
              const rn = normalize(r.title)
              return rn === titleNorm || rn.includes(titleNorm) || titleNorm.includes(rn)
            })
            if (byTitle) artistMatches = [byTitle]
          }

          if (!artistMatches.length) return

          const COMPILATION_RE = /greatest hits|best of|collection|anthology|compilation|platinum|hits|essential|сборник/i
          let match = artistMatches[0]
          if (id3Tags.album) {
            const albumNorm = normalize(id3Tags.album)
            const albumMatch = artistMatches.find(r =>
              normalize(r.album).includes(albumNorm) || albumNorm.includes(normalize(r.album))
            )
            if (albumMatch) match = albumMatch
          } else {
            const nonCompilation = artistMatches.find(r => !COMPILATION_RE.test(r.album))
            if (nonCompilation) match = nonCompilation
          }

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
      const processed = await Promise.all(
        segments.map((seg, i) =>
          processAudioSegment(sharedDecodedBuffer, seg, audioFile.artist, audioFile.title, i + 1)
        )
      )
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
