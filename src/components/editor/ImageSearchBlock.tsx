import type { AudioFile } from '../../types/audio'
import {
  buildArtistYearImagesQuery,
  buildYandexImagesUrl,
  buildGoogleImagesUrl,
  buildBingImagesUrl,
  buildDuckDuckGoImagesUrl,
  openUrlInNewTab,
} from '../../lib/imageSearch'

const ITEMS = [
  {
    key: 'google',
    label: 'Google',
    color: '#fff',
    bg: 'rgba(255,255,255,.05)',
    border: 'rgba(255,255,255,.1)',
    favicon: 'https://www.google.com/favicon.ico',
  },
  {
    key: 'yandex',
    label: 'Яндекс',
    color: '#FC3F1D',
    bg: 'rgba(252,63,29,.08)',
    border: 'rgba(252,63,29,.22)',
    favicon: 'https://yandex.ru/favicon.ico',
  },
  {
    key: 'ddg',
    label: 'DuckDuckGo',
    color: '#DE5833',
    bg: 'rgba(222,88,51,.08)',
    border: 'rgba(222,88,51,.22)',
    favicon: 'https://duckduckgo.com/favicon.ico',
  },
  {
    key: 'bing',
    label: 'Bing',
    color: '#0078D4',
    bg: 'rgba(0,120,212,.08)',
    border: 'rgba(0,120,212,.22)',
    favicon: 'https://www.bing.com/favicon.ico',
  },
] as const

interface ImageSearchBlockProps {
  audioFile: AudioFile
  fillHeight?: boolean
}

export function ImageSearchBlock({ audioFile, fillHeight }: ImageSearchBlockProps) {
  const q = buildArtistYearImagesQuery(audioFile)
  const urls: Record<string, string> = {
    google: buildGoogleImagesUrl(q),
    yandex: buildYandexImagesUrl(q),
    bing: buildBingImagesUrl(q),
    ddg: buildDuckDuckGoImagesUrl(q),
  }

  return (
    <div className={fillHeight ? 'flex flex-col h-full' : ''}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[.09em]" style={{ color: '#8a8a8a', fontFamily: 'Montserrat, sans-serif' }}>
        Найти фото
      </p>
      <div className={`grid grid-cols-2${fillHeight ? ' flex-1' : ''}`} style={{ gap: '9px', gridTemplateRows: fillHeight ? '1fr 1fr' : undefined }}>
        {ITEMS.map(({ key, label, color, bg, border, favicon }) => (
          <button
            key={key}
            type="button"
            className="flex items-center justify-center transition-opacity hover:opacity-80 focus-visible:outline-none"
            style={{ gap: '10px', padding: '8px 18px', borderRadius: '14px', background: bg, border: `1px solid ${border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openUrlInNewTab(urls[key]) }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title={urls[key]}
            aria-label={`Картинки, ${label}. ${q}`}
          >
            <img src={favicon} width={20} height={20} alt="" aria-hidden style={{ borderRadius: '4px', flexShrink: 0 }} />
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: 700, color }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
