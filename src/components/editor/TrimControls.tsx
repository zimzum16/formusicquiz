import React, { useEffect, useRef, useState } from 'react'
import type { TrimSegment, AudioFile } from '../../types/audio'
import { formatTimeDetailed, parseFlexibleTime, validateTimeRange } from '../../lib/audioUtils'
import { FadeControls, FadeInToolbarInline, FadeOutToolbarInline } from './FadeControls'
import { X } from 'lucide-react'
import { t } from '../../i18n'

interface TrimControlsProps {
  segment: TrimSegment
  audioFile: AudioFile
  canRemove: boolean
  onUpdate: (updates: Partial<TrimSegment>) => void
  onRemove: () => void
  variant: 'inline' | 'panel'
  panelIndex?: number
  playSlot?: React.ReactNode
  volumeSlot?: React.ReactNode | null
  inlineTrailingSlot?: React.ReactNode
}

const LABEL_STYLE = { fontFamily: 'Montserrat, sans-serif', color: '#8a8a8a' }

// Поле времени: пока в фокусе — свободный ввод, на blur/Enter значение уходит наверх, Escape — откат
function TimeField({ label, seconds, onCommit, resetKey, className, labelCl, inputCl, subCl }: {
  label: string
  seconds: number
  onCommit: (value: string) => void
  resetKey: string
  className?: string
  labelCl: string
  inputCl: string
  subCl?: string  // подпись с точным временем под полем; нет — не показываем
}) {
  const [draft, setDraft] = useState<string | null>(null)  // null — поле не редактируется
  const skipBlurRef = useRef(false)

  useEffect(() => { setDraft(null) }, [resetKey])

  return (
    <div className={className}>
      <label className={labelCl} style={LABEL_STYLE}>{label}</label>
      <input
        type="text" value={draft ?? formatTimeDetailed(seconds)} placeholder="00:00.0" className={inputCl}
        inputMode="decimal" autoComplete="off"
        onFocus={() => setDraft(formatTimeDetailed(seconds))}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          if (skipBlurRef.current) { skipBlurRef.current = false; return }
          if (draft !== null) onCommit(draft)
          setDraft(null)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
          if (e.key === 'Escape') {
            e.preventDefault(); skipBlurRef.current = true
            setDraft(null); e.currentTarget.blur()
          }
        }}
      />
      {subCl && <p className={subCl}>{formatTimeDetailed(seconds)}</p>}
    </div>
  )
}

function TrimTimeFields({
  segment, handleStartTimeChange, handleEndTimeChange, error, size, columns = 'both',
}: {
  segment: TrimSegment
  handleStartTimeChange: (v: string) => void
  handleEndTimeChange: (v: string) => void
  error: string | null
  size: 'default' | 'compact'
  columns?: 'both' | 'start' | 'end'
}) {
  const isCompact = size === 'compact'
  const slimCol = columns !== 'both' && isCompact

  const labelCl = isCompact
    ? slimCol
      ? 'block mb-1 w-full text-center text-xs font-medium'
      : 'block mb-1 text-xs font-medium'
    : 'block mb-2 text-sm font-medium'

  const inputBase = 'box-border w-[11ch] sm:w-[14ch] max-w-full min-w-0 px-2.5 py-1.5 font-mono text-sm tabular-nums leading-none rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:border-transparent'
  const inputCl = isCompact
    ? slimCol ? `${inputBase} text-center` : inputBase
    : 'box-border w-full max-w-[8ch] px-3 py-2.5 font-mono text-sm tabular-nums leading-none rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:border-transparent transition-all'
  const subCl = isCompact
    ? undefined
    : 'mt-1 max-w-[8ch] text-xs font-mono text-neutral-500 tabular-nums dark:text-neutral-500'
  const colOuter = slimCol ? 'shrink-0 flex flex-col items-center' : columns === 'both' ? undefined : 'shrink-0'

  const field = { resetKey: segment.id, className: colOuter, labelCl, inputCl, subCl }
  const startBlock = <TimeField {...field} label={t.trim_start} seconds={segment.startTime} onCommit={handleStartTimeChange} />
  const endBlock = <TimeField {...field} label={t.trim_end} seconds={segment.endTime} onCommit={handleEndTimeChange} />

  if (columns === 'start') return <>{startBlock}</>
  if (columns === 'end') return <>{endBlock}</>

  return (
    <>
      <div className={isCompact ? 'grid grid-cols-2 gap-x-2 gap-y-0 w-full sm:w-auto sm:max-w-md' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
        {startBlock}
        {endBlock}
      </div>
      {error && (
        <p className={isCompact ? 'w-full text-xs text-red-600 dark:text-red-400' : 'text-sm text-red-600 dark:text-red-400'}>
          {error}
        </p>
      )}
    </>
  )
}

export function TrimControls({
  segment, audioFile, canRemove, onUpdate, onRemove,
  variant, panelIndex, playSlot, volumeSlot, inlineTrailingSlot,
}: TrimControlsProps) {
  const maxDuration = audioFile.duration

  const handleStartTimeChange = (value: string) => {
    const time = parseFlexibleTime(value)
    onUpdate({ startTime: Math.max(0, Math.min(time, segment.endTime - 1)) })
  }
  const handleEndTimeChange = (value: string) => {
    const time = parseFlexibleTime(value)
    onUpdate({ endTime: Math.max(segment.startTime + 1, Math.min(time, maxDuration)) })
  }

  const error = validateTimeRange(segment.startTime, segment.endTime, maxDuration)

  if (variant === 'inline') {
    if (!playSlot) {
      return (
        <div className="flex w-full min-w-0 flex-col items-center gap-2">
          <div dir="ltr" className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:flex-nowrap">
            <TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={error} size="compact" columns="both" />
          </div>
        </div>
      )
    }

    const ctrls = (
      <div className="flex shrink-0 flex-nowrap items-center justify-center gap-x-1.5 sm:gap-x-3 lg:gap-x-6 xl:gap-x-8">
        <FadeInToolbarInline segment={segment} onUpdate={onUpdate} />
        <TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={null} size="compact" columns="start" />
        <div className="shrink-0">{playSlot}</div>
        <TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={null} size="compact" columns="end" />
        <FadeOutToolbarInline segment={segment} onUpdate={onUpdate} />
      </div>
    )

    if (!volumeSlot) {
      return (
        <div className="flex w-full min-w-0 flex-col items-center gap-2 mt-[30px]">
          <div dir="ltr" className="flex w-full items-center justify-center">{ctrls}</div>
          {error && <p className="w-full px-1 text-center text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )
    }

    return (
      <div className="flex w-full min-w-0 flex-col items-center gap-y-2 mt-[30px]">
        <div dir="ltr" className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-[7.125rem_1fr_auto] gap-y-2 sm:gap-y-0 sm:items-center">
          {/* Volume: centred on mobile, left column on sm+ */}
          <div className="relative flex items-center justify-center sm:justify-start">
            {volumeSlot}
            {inlineTrailingSlot && (
              <div className="sm:hidden absolute right-0">{inlineTrailingSlot}</div>
            )}
          </div>
          {/* Controls: always centred in middle column */}
          <div className="flex items-center justify-center overflow-x-auto">{ctrls}</div>
          {/* Trailing: right column on sm+ — spacer keeps controls centred when empty */}
          <div className="hidden sm:flex items-center justify-end pl-1 w-[7.125rem]">
            {inlineTrailingSlot}
          </div>
        </div>
        {error && <p className="w-full px-1 text-center text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }

  // variant === 'panel'
  return (
    <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 py-5 shadow-sm">
      {canRemove && (
        <button type="button" onClick={onRemove} className="absolute top-5 right-4 z-10 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors" aria-label={t.trim_remove_aria}>
          <X size={18} />
        </button>
      )}
      <div className="px-4 space-y-4">
        {typeof panelIndex === 'number' && <p className="pr-12 text-sm font-medium text-neutral-800 dark:text-neutral-100">{t.trim_slice_label} {panelIndex}</p>}
        <TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={error} size="default" />
        <FadeControls segment={segment} onUpdate={onUpdate} />
      </div>
    </div>
  )
}
