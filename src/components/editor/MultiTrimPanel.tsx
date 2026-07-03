import type { TrimSegment, AudioFile } from '../../types/audio'
import { TrimControls } from './TrimControls'

interface MultiTrimPanelProps {
  segments: TrimSegment[]
  audioFile: AudioFile
  onAddSegment: () => void
  onRemoveSegment: (id: string) => void
  onUpdateSegment: (id: string, updates: Partial<TrimSegment>) => void
}

export function MultiTrimPanel({
  segments,
  audioFile,
  onAddSegment,
  onRemoveSegment,
  onUpdateSegment,
}: MultiTrimPanelProps) {
  return (
    <div className="space-y-4">
      {!segments[1] ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onAddSegment}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: '980px',
              padding: '10px 22px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '.04em',
              cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Выбрать ещё фрагмент
          </button>
        </div>
      ) : null}

      <div className="space-y-4">
        {segments.slice(2).map((segment, i) => (
          <TrimControls
            key={segment.id}
            variant="panel"
            panelIndex={i + 3}
            segment={segment}
            audioFile={audioFile}
            canRemove={segments.length > 1}
            onUpdate={(updates) => onUpdateSegment(segment.id, updates)}
            onRemove={() => onRemoveSegment(segment.id)}
          />
        ))}
      </div>
    </div>
  )
}
