import type { SongMarker, SectionType } from '../../lib/songStructure'
import { formatTime } from '../../lib/audioUtils'
import { t } from '../../i18n'

interface SongStructurePanelProps {
  markers: SongMarker[]
  isAnalyzing: boolean
  onApplySegment: (start: number, end: number) => void
  duration: number
}

const SECTION_BG: Record<SectionType, string> = {
  intro:        'bg-blue-500',
  outro:        'bg-blue-400',
  verse:        'bg-emerald-500',
  'pre-chorus': 'bg-cyan-500',
  chorus:       'bg-purple-500',
  'post-chorus':'bg-pink-500',
  bridge:       'bg-orange-500',
  unknown:      'bg-neutral-500',
}

const SECTION_DOT: Record<SectionType, string> = {
  intro:        'bg-blue-400',
  outro:        'bg-blue-400',
  verse:        'bg-emerald-400',
  'pre-chorus': 'bg-cyan-400',
  chorus:       'bg-purple-400',
  'post-chorus':'bg-pink-400',
  bridge:       'bg-orange-400',
  unknown:      'bg-neutral-500',
}

const TYPE_LABEL: Record<SectionType, string> = {
  intro:        t.section_intro,
  outro:        t.section_outro,
  verse:        t.section_verse,
  'pre-chorus': t.section_pre_chorus,
  chorus:       t.section_chorus,
  'post-chorus':t.section_post_chorus,
  bridge:       t.section_bridge,
  unknown:      t.section_unknown,
}

export function SongStructurePanel({ markers, isAnalyzing, onApplySegment, duration }: SongStructurePanelProps) {
  if (isAnalyzing) {
    return <div className="h-8 w-full rounded-lg bg-white/10 animate-pulse" />
  }

  if (markers.length === 0) return null

  const seenTypes = new Set<SectionType>()
  const legendTypes = markers
    .map(m => m.type)
    .filter(t => { if (seenTypes.has(t)) return false; seenTypes.add(t); return true })

  const typeCounts: Partial<Record<SectionType, number>> = {}
  for (const m of markers) typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1
  const typeIdx: Partial<Record<SectionType, number>> = {}
  const barLabels = markers.map(m => {
    typeIdx[m.type] = (typeIdx[m.type] ?? 0) + 1
    return typeCounts[m.type]! > 1
      ? `${TYPE_LABEL[m.type]} ${typeIdx[m.type]}`
      : TYPE_LABEL[m.type]
  })

  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-lg h-8">
        {markers.map((marker, i) => (
          <button
            key={i}
            type="button"
            className={`absolute inset-y-0 flex items-center justify-center overflow-hidden px-1 text-[10px] font-semibold text-white ${SECTION_BG[marker.type]} hover:brightness-110 active:brightness-95 transition-[filter] cursor-pointer`}
            style={{
              left: `${(marker.start / duration) * 100}%`,
              width: `${((marker.end - marker.start) / duration) * 100}%`,
            }}
            onClick={() => onApplySegment(marker.start, marker.end)}
            title={`${barLabels[i]}: ${formatTime(marker.start)} – ${formatTime(marker.end)}`}
          >
            <span className="truncate leading-none">{barLabels[i]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {legendTypes.map(type => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-white/50">
            <div className={`h-2.5 w-2.5 rounded-sm shrink-0 ${SECTION_DOT[type]}`} />
            <span>{TYPE_LABEL[type]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
