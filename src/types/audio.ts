export interface AudioFile {
  file: File
  url: string
  duration: number
  // Битрейт исходника, кбит/с (для VBR — средний); undefined, если MP3-фреймы не распознаны
  bitrate?: number
  isVbr?: boolean
  artist: string
  title: string
  coverArt?: string
  album?: string
  year?: string
  genre?: string
  geniusUrl?: string
  isCover?: boolean
}

export interface TrimSegment {
  id: string
  startTime: number
  endTime: number
  fadeIn: boolean
  fadeOut: boolean
  fadeInDuration: number
  fadeOutDuration: number
}

export interface ProcessedAudioFile {
  id: string
  name: string
  blob: Blob
  url: string
  duration: number
}

export type FadeDuration = 1 | 2 | 3 | 4
