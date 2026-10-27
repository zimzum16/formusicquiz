import { useState, useCallback } from 'react'
import { t } from '../i18n'
import type { AudioFile, TrimSegment, ProcessedAudioFile } from '../types/audio'
import { exportMp3Segment, processAudioSegment } from '../lib/audioUtils'
import { scanFrames, type Mp3FrameIndex } from '../lib/mp3Container'
import { computePeaks } from '../lib/waveform'
import { fetchCover } from '../lib/id3Writer'
import { extractID3Tags, parseFilename } from '../lib/id3Parser'
import { tracksApi, searchItunesDirect } from '../lib/api'
import { analyzeSongStructure, type SongMarker, type SongAnalysis } from '../lib/songStructure'

// Убирает водяные знаки пиратских сайтов из ID3 тегов: [muzmo.ru], [zaycev.net] и т.п.
const SITE_TAG_RE = /\s*[[(][^\])\s]{2,50}\.(ru|net|com|org|me|cc|pw)[^\])]*[\])]/gi
function cleanSiteTag(s: string | undefined): string | undefined {
  if (!s) return s
  const cleaned = s.replace(SITE_TAG_RE, '').trim()
  // Если после очистки строка пустая или только спецсимволы — вернуть undefined
  return cleaned.replace(/[^a-zа-яё0-9\s]/gi, '').trim() ? cleaned : undefined
}

const UNKNOWN_ARTIST = t.unknown_artist

// Декодирование вынесено в отдельную функцию, чтобы AudioBuffer не попал в замыкания
// и освобождался сразу после использования: PCM весит ~10 МБ на минуту стерео.
async function decodeBytes(bytes: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  try {
    return await ctx.decodeAudioData(bytes)
  } finally {
    void ctx.close()
  }
}

async function decodeFile(file: File): Promise<AudioBuffer> {
  return decodeBytes(await file.arrayBuffer())
}

async function analyzeFile(file: File): Promise<{ peaks: Float32Array; duration: number; frames: Mp3FrameIndex | null }> {
  const bytes = await file.arrayBuffer()
  // Сканируем до декодирования: decodeAudioData забирает (detach) ArrayBuffer
  const frames = scanFrames(new Uint8Array(bytes))
  const audioBuffer = await decodeBytes(bytes)
  return { peaks: computePeaks(audioBuffer), duration: audioBuffer.duration, frames }
}

export function useAudioEditor() {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null)
  const [segments, setSegments] = useState<TrimSegment[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFiles, setProcessedFiles] = useState<ProcessedAudioFile[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [waveformPeaks, setWaveformPeaks] = useState<Float32Array | null>(null)
  const [mp3Frames, setMp3Frames] = useState<Mp3FrameIndex | null>(null)
  const [songMarkers, setSongMarkers] = useState<SongMarker[]>([])
  const [isAnalyzingStructure, setIsAnalyzingStructure] = useState(false)

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null)
    setUploadProgress(0)

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setError(t.err_only_mp3)
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError(t.err_file_too_large)
      return
    }

    try {
      setUploadProgress(30)

      const { peaks, duration, frames } = await analyzeFile(file)
      const url = URL.createObjectURL(file)
      setWaveformPeaks(peaks)
      setMp3Frames(frames)

      setUploadProgress(70)

      const id3Tags = await extractID3Tags(file)

      setUploadProgress(85)

      const siteTagged = !!(id3Tags.artist && !cleanSiteTag(id3Tags.artist))
        || !!(id3Tags.artist && SITE_TAG_RE.test(id3Tags.artist))
      let artist = cleanSiteTag(id3Tags.artist)
      let title = cleanSiteTag(id3Tags.title)

      if (!artist || !title) {
        const parsed = parseFilename(file.name)
        const isTrackNumber = parsed.artist ? /^\d{1,3}$/.test(parsed.artist.trim()) : false
        artist = artist || (isTrackNumber ? undefined : parsed.artist) || UNKNOWN_ARTIST
        title = title || parsed.title || file.name.replace('.mp3', '')
      }

      setUploadProgress(100)

      setAudioFile({
        file,
        url,
        duration,
        artist,
        title,
        coverArt: siteTagged ? undefined : id3Tags.coverArt,
        album: cleanSiteTag(id3Tags.album),
        year: id3Tags.year,
        genre: id3Tags.genre,
      })

      const hasId3Tags = !!(id3Tags.artist && id3Tags.title)

      const defaultSegment: TrimSegment = {
        id: crypto.randomUUID(),
        startTime: 0,
        endTime: duration,
        fadeIn: false,
        fadeOut: false,
        fadeInDuration: 1,
        fadeOutDuration: 1,
      }
      setSegments([defaultSegment])
      setProcessedFiles([])

      // Сначала Spotify/iTunes параллельно (подтверждаем title/artist/cover), затем Genius
      void (async () => {
        let confirmedTitle = title
        let confirmedArtist = artist
        let spotifyFound = false

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '')
        const searchArtist = artist === UNKNOWN_ARTIST ? undefined : artist

        // Запускаем iTunes сразу параллельно — прямо из браузера, не ждём Spotify
        const itunesPromise = searchItunesDirect(title, searchArtist).catch((): Awaited<ReturnType<typeof searchItunesDirect>> => [])

        try {
          const { tracks: results } = await tracksApi.search(title, searchArtist)

          if (results.length) {
            // Сравниваем без учёта алфавита (Alisa ≈ Алиса — одинаковые символы после strip)
            const latinToCyrillic: Record<string, string> = {
              a:'а',b:'б',v:'в',g:'г',d:'д',e:'е',z:'з',i:'и',
              k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',r:'р',s:'с',
              t:'т',u:'у',f:'ф',h:'х',c:'ц',y:'ы',
            }
            const normArtist = (s: string) => s.toLowerCase()
              .replace(/[^a-zа-яё]/gi, '')
              .replace(/[a-z]/g, c => latinToCyrillic[c] ?? c)

            const findArtistMatches = (res: typeof results, artistName: string) =>
              res.filter(r => {
                const rNorm = normArtist(r.artist)
                const aNorm = normArtist(artistName)
                return rNorm.includes(aNorm) || aNorm.includes(rNorm)
              })

            let artistMatches = artist === UNKNOWN_ARTIST ? [] : findArtistMatches(results, artist)

            // Если совпадений нет и теги не были в файле — порядок мог быть "Title - Artist"
            if (!artistMatches.length && !id3Tags.artist && !id3Tags.title) {
              const { tracks: swappedResults } = await tracksApi.search(artist, searchArtist)
              const swappedMatches = findArtistMatches(swappedResults, title)
              if (swappedMatches.length) {
                artistMatches = swappedMatches
                confirmedTitle = artist
                confirmedArtist = title
                setAudioFile(prev => prev ? { ...prev, title: confirmedTitle, artist: confirmedArtist } : prev)
              }
            }

            // Фолбэк: ищем хотя бы по названию трека
            if (!artistMatches.length) {
              const titleNorm = normalize(confirmedTitle)
              const byTitle = results.find(r => {
                const rn = normalize(r.title)
                return rn === titleNorm || rn.includes(titleNorm) || titleNorm.includes(rn)
              })
              if (byTitle) artistMatches = [byTitle]
            }

            if (artistMatches.length) {
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
              confirmedTitle = match.title
              confirmedArtist = match.artist.split(',')[0].trim()

              // Берём обложку от Spotify, при отсутствии ждём iTunes
              const spotifyCover = match.cover_url
              const itunesResults = await itunesPromise
              const itunesCover = itunesResults.find(r => {
                const rn = normalize(r.title)
                const tn = normalize(confirmedTitle)
                return rn === tn || rn.includes(tn) || tn.includes(rn)
              })?.cover_url ?? itunesResults.find(r => r.cover_url)?.cover_url ?? null

              setAudioFile(prev => prev ? {
                ...prev,
                coverArt: spotifyCover ?? itunesCover ?? prev.coverArt,
                album: match.album || prev.album,
                year: year || prev.year,
                title: confirmedTitle,
                artist: confirmedArtist,
              } : prev)
              spotifyFound = true
            }
          }
        } catch (e) {
          console.warn('[upload] spotify search failed, falling back to iTunes:', e)
          // Spotify/сервер недоступен — используем уже запущенный iTunes
          try {
            const itunesResults = await itunesPromise
            if (itunesResults.length) {
              const titleNorm = normalize(confirmedTitle)
              const artistNorm = confirmedArtist !== UNKNOWN_ARTIST ? normalize(confirmedArtist) : null
              const albumNorm = id3Tags.album ? normalize(id3Tags.album) : null

              const titleMatch = itunesResults.find(r => {
                const rn = normalize(r.title)
                return rn === titleNorm || rn.includes(titleNorm) || titleNorm.includes(rn)
              })
              const titleArtistMatch = titleMatch && artistNorm
                ? (() => { const rn = normalize(titleMatch.artist); return rn.includes(artistNorm) || artistNorm.includes(rn) })()
                : false

              const artistAlbumMatch = artistNorm && albumNorm
                ? itunesResults.find(r => {
                    const rArtist = normalize(r.artist)
                    const rAlbum = r.album ? normalize(r.album) : ''
                    return (rArtist.includes(artistNorm) || artistNorm.includes(rArtist))
                      && (rAlbum.includes(albumNorm) || albumNorm.includes(rAlbum))
                  })
                : null

              if (titleMatch && titleArtistMatch) {
                confirmedTitle = titleMatch.title
                confirmedArtist = titleMatch.artist.split(',')[0].trim()
                setAudioFile(prev => prev ? {
                  ...prev,
                  coverArt: titleMatch.cover_url ?? prev.coverArt,
                  album: titleMatch.album || prev.album,
                  year: titleMatch.release_date?.slice(0, 4) || prev.year,
                  title: confirmedTitle,
                  artist: confirmedArtist,
                } : prev)
                spotifyFound = true
              } else if (artistAlbumMatch) {
                // Совпал артист + альбом но не конкретный трек — берём только обложку/мета
                setAudioFile(prev => prev ? {
                  ...prev,
                  coverArt: artistAlbumMatch.cover_url ?? prev.coverArt,
                  album: artistAlbumMatch.album || prev.album,
                  year: artistAlbumMatch.release_date?.slice(0, 4) || prev.year,
                } : prev)
              }
              // Иначе ничего не трогаем — Genius разберётся с title/artist
            }
          } catch { /* iTunes тоже недоступен */ }
        }

        // Запускаем Genius с подтверждёнными данными от Spotify/iTunes
        setIsAnalyzingStructure(true)
        analyzeSongStructure(confirmedTitle, confirmedArtist, duration, (gTitle, gArtist, geniusUrl, isCover) => {
          setAudioFile(prev => {
            if (!prev) return prev
            const updates: Partial<typeof prev> = {}
            if (!hasId3Tags && !spotifyFound && (gTitle !== confirmedTitle || gArtist !== confirmedArtist)) {
              updates.title = gTitle
              updates.artist = gArtist
            }
            if (geniusUrl !== undefined) updates.geniusUrl = geniusUrl
            if (isCover !== undefined) updates.isCover = isCover
            return Object.keys(updates).length ? { ...prev, ...updates } : prev
          })
        })
          .then((analysis: SongAnalysis) => {
            setSongMarkers(analysis.markers)
          })
          .finally(() => setIsAnalyzingStructure(false))
      })()
    } catch (err) {
      setError(t.err_upload_failed)
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
    if (!audioFile || segments.length === 0) {
      setError(t.err_audio_unavailable)
      return
    }

    setIsProcessing(true)
    processedFiles.forEach(f => URL.revokeObjectURL(f.url))
    setProcessedFiles([])
    setError(null)

    try {
      const cover = await fetchCover(audioFile.coverArt)
      const tags = {
        title: audioFile.title,
        artist: audioFile.artist === UNKNOWN_ARTIST ? undefined : audioFile.artist,
        album: audioFile.album,
        year: audioFile.year,
        genre: audioFile.genre,
        cover,
      }
      let processed: ProcessedAudioFile[]
      if (mp3Frames) {
        processed = await Promise.all(
          segments.map((seg, i) => exportMp3Segment(audioFile.file, mp3Frames, seg, tags, i + 1))
        )
      } else {
        // Фреймы не распознались — старый путь: полное декодирование и перекодирование.
        // PCM нужен только на время экспорта — отпускаем после
        const audioBuffer = await decodeFile(audioFile.file)
        processed = await Promise.all(
          segments.map((seg, i) => processAudioSegment(audioBuffer, seg, tags, i + 1))
        )
      }
      setProcessedFiles(processed)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setError(`${t.err_processing} ${detail}`)
    } finally {
      setIsProcessing(false)
    }
  }, [audioFile, segments, processedFiles, mp3Frames])

  const reset = useCallback(() => {
    if (audioFile?.url) URL.revokeObjectURL(audioFile.url)
    processedFiles.forEach(f => URL.revokeObjectURL(f.url))
    setAudioFile(null)
    setSegments([])
    setWaveformPeaks(null)
    setMp3Frames(null)
    setProcessedFiles([])
    setUploadProgress(0)
    setError(null)
    setSongMarkers([])
    setIsAnalyzingStructure(false)
  }, [audioFile, processedFiles])

  return {
    audioFile,
    segments,
    waveformPeaks,
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
