import type { AudioFile } from '../../types/audio'
import { ImageSearchBlock } from './ImageSearchBlock'

interface SongInfoProps {
  audioFile: AudioFile
}

const SANS: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif' }

function parseFeat(raw: string): { cleanTitle: string; feat: string | null } {
  const m = raw.match(/^(.*?)\s*[\(\[](feat\.?|ft\.?|featuring)\s*([^\)\]]+)[\)\]](.*)$/i)
  if (!m) return { cleanTitle: raw, feat: null }
  return { cleanTitle: (m[1] + m[4]).trim(), feat: m[3].trim() }
}

export function SongInfo({ audioFile }: SongInfoProps) {
  const { artist, title: rawTitle, album, coverArt, year, geniusUrl } = audioFile
  const { cleanTitle: title, feat } = parseFeat(rawTitle)

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
      Текст песни
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
          <p className="font-medium" style={{ fontSize: 'clamp(14px,3vw,17px)', color: '#8a8a8a', ...SANS }}>
            {artist}
          </p>
          {feat && (
            <p className="font-medium mb-3 sm:mb-4 mt-0.5" style={{ fontSize: 'clamp(14px,3vw,17px)', color: '#8a8a8a', ...SANS }}>
              feat. {feat}
            </p>
          )}
          {!feat && <div className="mb-3 sm:mb-4" />}
          {chips}
          {geniusLink}
        </div>

        {/* Search block: visible only on sm+ */}
        <div className="hidden sm:flex shrink-0 self-start h-[160px]">
          <ImageSearchBlock audioFile={audioFile} fillHeight />
        </div>
      </div>

      {/* Search block: visible only on mobile */}
      <div className="sm:hidden mt-4">
        <ImageSearchBlock audioFile={audioFile} />
      </div>
    </div>
  )
}
