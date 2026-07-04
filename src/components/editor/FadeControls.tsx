import type { TrimSegment, FadeDuration } from '../../types/audio'

const FADE_DURATIONS: FadeDuration[] = [1, 2, 3, 4]

function clampFadeSec(v: number): FadeDuration {
  return (Math.min(4, Math.max(1, Math.round(v))) || 1) as FadeDuration
}

const CHIP_BASE = 'h-[17px] w-[17px] sm:h-[19px] sm:w-[19px] flex-shrink-0 rounded-[4px] text-[10px] font-bold transition-colors flex items-center justify-center'
const CHIP_ON = 'bg-[#2DD4BF] text-[#06231f]'
const CHIP_OFF = 'border-2 border-[#3d424c] bg-[#2d3139] text-white hover:border-[#2DD4BF]/50'

function IconFadeIn({ className }: { className?: string }) {
  const bottom = 26, w = 4, gaps = 4
  const heights = [8, 12, 16, 20]
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      {heights.map((h, i) => (
        <rect key={i} x={2 + i * (w + gaps)} y={bottom - h} width={w} height={h} rx={w / 2} ry={w / 2} />
      ))}
    </svg>
  )
}

function IconFadeOut({ className }: { className?: string }) {
  const bottom = 26, w = 4, gaps = 4
  const heights = [20, 16, 12, 8]
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      {heights.map((h, i) => (
        <rect key={i} x={2 + i * (w + gaps)} y={bottom - h} width={w} height={h} rx={w / 2} ry={w / 2} />
      ))}
    </svg>
  )
}

const ICON_BTN =
  'flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-[10px] border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:ring-offset-2 focus-visible:ring-offset-black'
const BTN_OFF =
  'border-neutral-300 bg-neutral-200/90 text-neutral-800 dark:border-[#3d424c] dark:bg-[#2d3139] dark:text-white'
const BTN_ON = 'border-[#2DD4BF] bg-[#2DD4BF] text-[#06231f]'


interface ToolbarFadeProps {
  segment: TrimSegment
  onUpdate: (updates: Partial<TrimSegment>) => void
}

export function FadeInToolbarInline({ segment, onUpdate }: ToolbarFadeProps) {
  const fadeInSec = clampFadeSec(Number(segment.fadeInDuration) || 1)
  return (
    <div className="flex shrink-0 items-center justify-center gap-2">
      {segment.fadeIn && (
        <div className="grid grid-cols-2 gap-[2px]">
          {FADE_DURATIONS.map(n => (
            <button
              key={n} type="button"
              onClick={() => onUpdate({ fadeInDuration: n })}
              className={`${CHIP_BASE} ${fadeInSec === n ? CHIP_ON : CHIP_OFF}`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
              aria-label={`${n} с`}
            >{n}</button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onUpdate(segment.fadeIn ? { fadeIn: false } : { fadeIn: true, fadeInDuration: fadeInSec })}
        className={`${ICON_BTN} ${segment.fadeIn ? BTN_ON : BTN_OFF}`}
        title="Нарастание громкости"
        aria-pressed={segment.fadeIn}
      >
        <IconFadeIn className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
      </button>
    </div>
  )
}

export function FadeOutToolbarInline({ segment, onUpdate }: ToolbarFadeProps) {
  const fadeOutSec = clampFadeSec(Number(segment.fadeOutDuration) || 1)
  return (
    <div className="flex shrink-0 items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onUpdate(segment.fadeOut ? { fadeOut: false } : { fadeOut: true, fadeOutDuration: fadeOutSec })}
        className={`${ICON_BTN} ${segment.fadeOut ? BTN_ON : BTN_OFF}`}
        title="Затухание громкости"
        aria-pressed={segment.fadeOut}
      >
        <IconFadeOut className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
      </button>
      {segment.fadeOut && (
        <div className="grid grid-cols-2 gap-[2px]">
          {FADE_DURATIONS.map(n => (
            <button
              key={n} type="button"
              onClick={() => onUpdate({ fadeOutDuration: n })}
              className={`${CHIP_BASE} ${fadeOutSec === n ? CHIP_ON : CHIP_OFF}`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
              aria-label={`${n} с`}
            >{n}</button>
          ))}
        </div>
      )}
    </div>
  )
}

interface FadeControlsProps {
  segment: TrimSegment
  onUpdate: (updates: Partial<TrimSegment>) => void
}

export function FadeControls({ segment, onUpdate }: FadeControlsProps) {
  const fadeInSec = clampFadeSec(Number(segment.fadeInDuration) || 1)
  const fadeOutSec = clampFadeSec(Number(segment.fadeOutDuration) || 1)

  return (
    <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox" checked={segment.fadeIn}
              onChange={e => onUpdate(e.target.checked ? { fadeIn: true, fadeInDuration: fadeInSec } : { fadeIn: false })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-medium" style={{ color: '#8a8a8a', fontFamily: 'Montserrat, sans-serif' }}>Добавить нарастание звука</span>
        </label>
        {segment.fadeIn && (
          <select
            value={fadeInSec}
            onChange={e => onUpdate({ fadeInDuration: parseFloat(e.target.value) as FadeDuration })}
            className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FADE_DURATIONS.map(d => <option key={d} value={d}>{d} сек</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox" checked={segment.fadeOut}
              onChange={e => onUpdate(e.target.checked ? { fadeOut: true, fadeOutDuration: fadeOutSec } : { fadeOut: false })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-medium" style={{ color: '#8a8a8a', fontFamily: 'Montserrat, sans-serif' }}>Добавить затухание звука</span>
        </label>
        {segment.fadeOut && (
          <select
            value={fadeOutSec}
            onChange={e => onUpdate({ fadeOutDuration: parseFloat(e.target.value) as FadeDuration })}
            className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FADE_DURATIONS.map(d => <option key={d} value={d}>{d} сек</option>)}
          </select>
        )}
      </div>
    </div>
  )
}
