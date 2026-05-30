import type { AudioFile } from '../../types/audio'
import {
  buildArtistYearImagesQuery,
  buildYandexImagesUrl,
  buildGoogleImagesUrl,
  buildBingImagesUrl,
  buildDuckDuckGoImagesUrl,
  openUrlInNewTab,
} from '../../lib/imageSearch'

function IconYandex({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#FC3F1E" />
      <text x="12" y="17.5" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700" fontFamily="system-ui, 'Segoe UI', sans-serif">Я</text>
    </svg>
  )
}

function IconGoogle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#fff" />
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function IconBing({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#0085F2" />
      <text x="12" y="17.5" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="800" fontFamily="system-ui, 'Segoe UI', sans-serif">b</text>
    </svg>
  )
}

function IconDuckDuckGo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#DE5833" />
      <text x="12" y="17.2" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="system-ui, 'Segoe UI', sans-serif">D</text>
    </svg>
  )
}

interface ImageSearchBlockProps {
  audioFile: AudioFile
  placement?: 'below' | 'aside'
}

export function ImageSearchBlock({ audioFile, placement = 'below' }: ImageSearchBlockProps) {
  const q = buildArtistYearImagesQuery(audioFile)
  const yandex = buildYandexImagesUrl(q)
  const google = buildGoogleImagesUrl(q)
  const bing = buildBingImagesUrl(q)
  const ddg = buildDuckDuckGoImagesUrl(q)

  const items = [
    { key: 'yandex', label: 'Яндекс', url: yandex, Icon: IconYandex, aria: `Картинки, Яндекс. ${q}` },
    { key: 'google', label: 'Google', url: google, Icon: IconGoogle, aria: `Картинки, Google. ${q}` },
    { key: 'bing', label: 'Bing', url: bing, Icon: IconBing, aria: `Картинки, Bing. ${q}` },
    { key: 'ddg', label: 'DuckDuckGo', url: ddg, Icon: IconDuckDuckGo, aria: `Картинки, DuckDuckGo. ${q}` },
  ] as const

  const wrapperClass = placement === 'aside'
    ? ''
    : 'mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-6'

  return (
    <div className={wrapperClass}>
      <p className="mb-3 text-sm font-bold tracking-wide text-neutral-500 dark:text-neutral-500">
        Найти фото музыкантов
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ key, label, url, Icon, aria }) => (
          <button
            key={key}
            type="button"
            className="group flex min-h-[5rem] w-full cursor-pointer items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-center transition-all hover:border-blue-400 dark:hover:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openUrlInNewTab(url) }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title={url}
            aria-label={aria}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                <Icon className="h-8 w-8" />
              </div>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
