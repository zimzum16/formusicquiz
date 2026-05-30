import type { TrimSegment, AudioFile } from '../../types/audio'
import { TrimControls } from './TrimControls'
import { Plus } from 'lucide-react'

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
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="text-sm">Выбрать ещё фрагмент</span>
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
