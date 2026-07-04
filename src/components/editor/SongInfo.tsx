import type { AudioFile } from '../../types/audio'
import { ImageSearchBlock } from './ImageSearchBlock'

interface SongInfoProps {
  audioFile: AudioFile
}

const SANS: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif' }

export function SongInfo({ audioFile }: SongInfoProps) {
  const { artist, title, album, coverArt, year, genre, geniusUrl } = audioFile

  const chips = (
    <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
      {album && (
        <span className="inline-flex items-center font-semibold text-white border border-white/[0.1]" style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(255,255,255,.07)', fontSize: '13px', ...SANS }}>
          {album}
        </span>
      )}
      {year && (
        <span className="inline-flex items-center font-semibold text-white border border-white/[0.1]" style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(255,255,255,.07)', fontSize: '13px', ...SANS }}>
          {year}
        </span>
      )}
      {genre && (
        <span className="inline-flex items-center font-semibold border border-white/[0.1]" style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(255,255,255,.07)', fontSize: '13px', color: '#8a8a8a', ...SANS }}>
          {genre}
        </span>
      )}
    </div>
  )

  const geniusLink = geniusUrl ? (
    <a
      href={geniusUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-[6px] font-bold hover:opacity-80 transition-opacity"
      style={{ fontSize: '14px', color: '#2DD4BF', textDecoration: 'none', ...SANS }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#2DD4BF">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.77 17.4c-2.714 0-4.714-2.057-4.714-4.8 0-2.743 2-4.8 4.714-4.8 1.257 0 2.286.457 3.086 1.257l-1.257 1.257c-.457-.457-1.029-.686-1.829-.686-1.543 0-2.743 1.2-2.743 2.972s1.2 2.972 2.743 2.972c1.714 0 2.4-.857 2.514-1.8H12.77v-1.714h4.457c.057.343.086.686.086 1.086 0 2.914-1.829 4.257-4.543 4.257z" />
      </svg>
      Открыть текст на Genius
    </a>
  ) : null

  return (
    <div
      className="w-full rounded-[20px] border border-white/[0.1] p-4 sm:p-[24px_28px]"
      style={{
        background: 'rgba(24,24,28,.78)',
        backdropFilter: 'saturate(180%) blur(24px)',
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), 0 12px 40px rgba(0,0,0,.55)',
      }}
    >
      {/* Desktop: single row. Mobile: image+meta row, buttons below */}
      <div className="flex items-start sm:items-center gap-4 sm:gap-7">
        {coverArt && (
          <div className="shrink-0">
            <img
              src={coverArt}
              alt={`${artist} - ${title}`}
              className="rounded-[12px] sm:rounded-[16px] object-cover w-[80px] h-[80px] sm:w-[200px] sm:h-[200px]"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,.6)' }}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-white leading-tight mb-[4px] sm:mb-[6px]" style={{ fontSize: 'clamp(18px,4vw,26px)', letterSpacing: '-.03em', lineHeight: 1.1, ...SANS }}>
            {title}
          </h2>
          <p className="font-medium mb-3 sm:mb-4" style={{ fontSize: 'clamp(14px,3vw,17px)', color: '#8a8a8a', ...SANS }}>
            {artist}
          </p>
          {chips}
          {geniusLink}
        </div>

        {/* Search block: visible only on sm+ */}
        <div className="hidden sm:block shrink-0 self-center">
          <ImageSearchBlock audioFile={audioFile} />
        </div>
      </div>

      {/* Search block: visible only on mobile */}
      <div className="sm:hidden mt-4">
        <ImageSearchBlock audioFile={audioFile} />
      </div>
    </div>
  )
}
