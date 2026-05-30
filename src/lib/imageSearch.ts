import type { AudioFile } from '../types/audio'

export function buildArtistYearImagesQuery(audioFile: AudioFile): string {
  const { artist, year, file } = audioFile
  const yearMatch = year?.match(/\b(19|20)\d{2}\b/)
  const y = yearMatch ? yearMatch[0] : null
  const fromMeta = [artist, y].filter(Boolean).join(' ')
  if (fromMeta.trim()) return normalizeQuery(fromMeta)
  return normalizeQuery(file.name.replace(/\.[^.]+$/i, ''))
}

function normalizeQuery(s: string): string {
  return s.replace(/[–—]/g, ' ').replace(/[''«»]/g, '').replace(/\s+/g, ' ').trim()
}

export function buildYandexImagesUrl(text: string): string {
  const p = new URLSearchParams({ from: 'tabbar', text, isize: 'large', iorient: 'horizontal' })
  return `https://yandex.ru/images/search?${p}`
}

export function buildGoogleImagesUrl(text: string): string {
  const p = new URLSearchParams({ q: text, tbm: 'isch', tbs: 'isz:l,iar:w' })
  return `https://www.google.com/search?${p}`
}

export function buildBingImagesUrl(text: string): string {
  const p = new URLSearchParams({ q: text, qft: '+filterui:imagesize-wallpaper+filterui:aspect-wide' })
  return `https://www.bing.com/images/search?${p}`
}

export function buildDuckDuckGoImagesUrl(text: string): string {
  const p = new URLSearchParams({ q: text, ia: 'images', iax: 'images', iaf: 'size:Wallpaper,layout:Wide' })
  return `https://duckduckgo.com/?${p}`
}

export function openUrlInNewTab(url: string): void {
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('target', '_blank')
  a.setAttribute('rel', 'noopener noreferrer')
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
