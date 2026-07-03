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
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden>
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 8.29C4.672 6.163 6.656 4.58 9 4.58z"/>
      </svg>
    ),
  },
  {
    key: 'yandex',
    label: 'Яндекс',
    color: '#FC3F1D',
    bg: 'rgba(252,63,29,.08)',
    border: 'rgba(252,63,29,.22)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC3F1D" aria-hidden>
        <path d="M15.12 21H12.6l-4.2-7.5H6.9V21H4.5V3h4.68c3.54 0 5.58 1.8 5.58 5.04 0 2.4-1.2 4.08-3.24 4.8L15.12 21zm-5.94-9.54c2.1 0 3.3-.96 3.3-2.88S11.28 5.7 9.18 5.7H6.9v5.76h2.28z"/>
      </svg>
    ),
  },
  {
    key: 'bing',
    label: 'Bing',
    color: '#0078D4',
    bg: 'rgba(0,120,212,.08)',
    border: 'rgba(0,120,212,.22)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path d="M5.5 3v13l3.5 2.2 7-4.8-4-2.2-3.5 1.8V8L5.5 3z" fill="#0078D4"/>
      </svg>
    ),
  },
  {
    key: 'ddg',
    label: 'DDG',
    color: '#DE5833',
    bg: 'rgba(222,88,51,.08)',
    border: 'rgba(222,88,51,.22)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="10" r="5.5" fill="#DE5833"/>
        <circle cx="12" cy="10" r="2.5" fill="#fff"/>
        <ellipse cx="12" cy="17" rx="3" ry="2" fill="#DE5833"/>
      </svg>
    ),
  },
] as const

interface ImageSearchBlockProps {
  audioFile: AudioFile
  placement?: 'below' | 'aside'
}

export function ImageSearchBlock({ audioFile }: ImageSearchBlockProps) {
  const q = buildArtistYearImagesQuery(audioFile)
  const urls: Record<string, string> = {
    google: buildGoogleImagesUrl(q),
    yandex: buildYandexImagesUrl(q),
    bing: buildBingImagesUrl(q),
    ddg: buildDuckDuckGoImagesUrl(q),
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[.09em]" style={{ color: '#8a8a8a', fontFamily: 'Montserrat, sans-serif' }}>
        Найти фото
      </p>
      <div className="grid grid-cols-2" style={{ gap: '9px' }}>
        {ITEMS.map(({ key, label, color, bg, border, icon }) => (
          <button
            key={key}
            type="button"
            className="flex items-center transition-opacity hover:opacity-80 focus-visible:outline-none"
            style={{ gap: '10px', padding: '12px 18px', borderRadius: '14px', background: bg, border: `1px solid ${border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openUrlInNewTab(urls[key]) }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title={urls[key]}
            aria-label={`Картинки, ${label}. ${q}`}
          >
            {icon}
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: 700, color }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
