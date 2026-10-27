import type { TrimSegment, FadeDuration } from '../../types/audio'
import { t } from '../../i18n'

const FADE_DURATIONS: FadeDuration[] = [1, 2, 3, 4]

function clampFadeSec(v: number): FadeDuration {
  return (Math.min(4, Math.max(1, Math.round(v))) || 1) as FadeDuration
}

const CHIP_BASE = 'h-[17px] w-[17px] sm:h-[19px] sm:w-[19px] flex-shrink-0 rounded-[4px] text-[10px] font-bold transition-colors flex items-center justify-center'
const CHIP_ON = 'bg-[#2DD4BF] text-[#06231f]'
const CHIP_OFF = 'border-2 border-[#3d424c] bg-[#2d3139] text-white hover:border-[#2DD4BF]/50'

// Нарастающие (fade in) или убывающие (fade out) столбики
function IconFade({ heights, className }: { heights: number[]; className?: string }) {
  const bottom = 26, w = 4, gaps = 4
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


type Side = 'in' | 'out'

// Всё, чем fade in отличается от fade out: поля сегмента, подписи, иконка
const SIDES = {
  in: {
    enabled: (s: TrimSegment) => s.fadeIn,
    duration: (s: TrimSegment) => s.fadeInDuration,
    toggle: (on: boolean, sec: FadeDuration): Partial<TrimSegment> => on ? { fadeIn: true, fadeInDuration: sec } : { fadeIn: false },
    setDuration: (sec: FadeDuration): Partial<TrimSegment> => ({ fadeInDuration: sec }),
    title: t.fade_in_title,
    addLabel: t.fade_in_add,
    bars: [8, 12, 16, 20],
  },
  out: {
    enabled: (s: TrimSegment) => s.fadeOut,
    duration: (s: TrimSegment) => s.fadeOutDuration,
    toggle: (on: boolean, sec: FadeDuration): Partial<TrimSegment> => on ? { fadeOut: true, fadeOutDuration: sec } : { fadeOut: false },
    setDuration: (sec: FadeDuration): Partial<TrimSegment> => ({ fadeOutDuration: sec }),
    title: t.fade_out_title,
    addLabel: t.fade_out_add,
    bars: [20, 16, 12, 8],
  },
} satisfies Record<Side, unknown>

interface FadeProps {
  segment: TrimSegment
  onUpdate: (updates: Partial<TrimSegment>) => void
}

// Кнопка-иконка и сетка длительностей; у fade in сетка слева от кнопки, у fade out — справа
function FadeToolbarInline({ segment, onUpdate, side }: FadeProps & { side: Side }) {
  const cfg = SIDES[side]
  const enabled = cfg.enabled(segment)
  const sec = clampFadeSec(Number(cfg.duration(segment)) || 1)
  const chips = enabled && (
    <div className="grid grid-cols-2 gap-[2px]">
      {FADE_DURATIONS.map(n => (
        <button
          key={n} type="button"
          onClick={() => onUpdate(cfg.setDuration(n))}
          className={`${CHIP_BASE} ${sec === n ? CHIP_ON : CHIP_OFF}`}
          style={{ fontFamily: 'Montserrat, sans-serif' }}
          aria-label={`${n} ${t.fade_sec}`}
        >{n}</button>
      ))}
    </div>
  )
  return (
    <div className="flex shrink-0 items-center justify-center gap-2">
      {side === 'in' && chips}
      <button
        type="button"
        onClick={() => onUpdate(cfg.toggle(!enabled, sec))}
        className={`${ICON_BTN} ${enabled ? BTN_ON : BTN_OFF}`}
        title={cfg.title}
        aria-pressed={enabled}
      >
        <IconFade heights={cfg.bars} className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
      </button>
      {side === 'out' && chips}
    </div>
  )
}

export const FadeInToolbarInline = (props: FadeProps) => <FadeToolbarInline {...props} side="in" />
export const FadeOutToolbarInline = (props: FadeProps) => <FadeToolbarInline {...props} side="out" />

// Переключатель и выбор длительности — для панельного вида
function FadeRow({ segment, onUpdate, side }: FadeProps & { side: Side }) {
  const cfg = SIDES[side]
  const enabled = cfg.enabled(segment)
  const sec = clampFadeSec(Number(cfg.duration(segment)) || 1)
  return (
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox" checked={enabled}
            onChange={e => onUpdate(cfg.toggle(e.target.checked, sec))}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full peer-checked:bg-blue-600 transition-colors" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </div>
        <span className="text-sm font-medium" style={{ color: '#8a8a8a', fontFamily: 'Montserrat, sans-serif' }}>{cfg.addLabel}</span>
      </label>
      {enabled && (
        <select
          value={sec}
          onChange={e => onUpdate(cfg.setDuration(parseFloat(e.target.value) as FadeDuration))}
          className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FADE_DURATIONS.map(d => <option key={d} value={d}>{d} {t.fade_sec}</option>)}
        </select>
      )}
    </div>
  )
}

export function FadeControls({ segment, onUpdate }: FadeProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
      <FadeRow segment={segment} onUpdate={onUpdate} side="in" />
      <FadeRow segment={segment} onUpdate={onUpdate} side="out" />
    </div>
  )
}
