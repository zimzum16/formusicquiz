import React, { useEffect, useRef, useState } from 'react'
import type { TrimSegment, AudioFile } from '../../types/audio'
import { formatTimeDetailed, parseFlexibleTime, validateTimeRange } from '../../lib/audioUtils'
import { FadeControls, FadeInToolbarInline, FadeOutToolbarInline } from './FadeControls'
import { X } from 'lucide-react'

interface TrimControlsProps {
  segment: TrimSegment
  audioFile: AudioFile
  canRemove: boolean
  onUpdate: (updates: Partial<TrimSegment>) => void
  onRemove: () => void
  variant?: 'card' | 'inline' | 'panel'
  panelIndex?: number
  playSlot?: React.ReactNode
  volumeSlot?: React.ReactNode | null
  inlineTrailingSlot?: React.ReactNode
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
  const [focused, setFocused] = useState<'start' | 'end' | null>(null)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const skipStartBlurRef = useRef(false)
  const skipEndBlurRef = useRef(false)

  useEffect(() => { setFocused(null) }, [segment.id])

  const startDisplay = focused === 'start' ? draftStart : formatTimeDetailed(segment.startTime)
  const endDisplay = focused === 'end' ? draftEnd : formatTimeDetailed(segment.endTime)

  const isCompact = size === 'compact'
  const slimCol = columns !== 'both' && isCompact

  const LABEL_STYLE = { fontFamily: 'Montserrat, sans-serif', color: '#8a8a8a' }
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
    ? 'mt-0.5 w-[14ch] max-w-full text-[10px] font-mono text-neutral-500 tabular-nums dark:text-neutral-500 text-center'
    : 'mt-1 max-w-[8ch] text-xs font-mono text-neutral-500 tabular-nums dark:text-neutral-500'
  const colOuter = slimCol ? 'shrink-0 flex flex-col items-center' : columns === 'both' ? undefined : 'shrink-0'

  const onStartBlur = () => {
    if (skipStartBlurRef.current) { skipStartBlurRef.current = false; return }
    handleStartTimeChange(draftStart)
    setFocused(f => f === 'start' ? null : f)
  }
  const onEndBlur = () => {
    if (skipEndBlurRef.current) { skipEndBlurRef.current = false; return }
    handleEndTimeChange(draftEnd)
    setFocused(f => f === 'end' ? null : f)
  }

  const startBlock = (
    <div className={colOuter}>
      <label className={labelCl} style={LABEL_STYLE}>Начало</label>
      <input
        type="text" value={startDisplay} placeholder="00:00.0" className={inputCl}
        inputMode="decimal" autoComplete="off"
        onFocus={() => { setFocused('start'); setDraftStart(formatTimeDetailed(segment.startTime)) }}
        onChange={e => setDraftStart(e.target.value)}
        onBlur={onStartBlur}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
          if (e.key === 'Escape') {
            e.preventDefault(); skipStartBlurRef.current = true
            setDraftStart(formatTimeDetailed(segment.startTime)); setFocused(null); e.currentTarget.blur()
          }
        }}
      />
      {!isCompact && <p className={subCl}>{formatTimeDetailed(segment.startTime)}</p>}
    </div>
  )

  const endBlock = (
    <div className={colOuter}>
      <label className={labelCl} style={LABEL_STYLE}>Конец</label>
      <input
        type="text" value={endDisplay} placeholder="00:00.0" className={inputCl}
        inputMode="decimal" autoComplete="off"
        onFocus={() => { setFocused('end'); setDraftEnd(formatTimeDetailed(segment.endTime)) }}
        onChange={e => setDraftEnd(e.target.value)}
        onBlur={onEndBlur}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
          if (e.key === 'Escape') {
            e.preventDefault(); skipEndBlurRef.current = true
            setDraftEnd(formatTimeDetailed(segment.endTime)); setFocused(null); e.currentTarget.blur()
          }
        }}
      />
      {!isCompact && <p className={subCl}>{formatTimeDetailed(segment.endTime)}</p>}
    </div>
  )

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
  variant = 'card', panelIndex, playSlot, volumeSlot, inlineTrailingSlot,
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
        <div dir="ltr" className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-[7.125rem_1fr_7.125rem] gap-y-2 sm:gap-y-0 sm:items-center">
          {/* Volume: centred on mobile, left column on sm+ */}
          <div className="relative flex items-center justify-center sm:justify-start">
            {volumeSlot}
            {inlineTrailingSlot && (
              <div className="sm:hidden absolute right-0">{inlineTrailingSlot}</div>
            )}
          </div>
          {/* Controls: always centred in middle column */}
          <div className="flex items-center justify-center">{ctrls}</div>
          {/* Trailing: right column on sm+ */}
          <div className="hidden sm:flex items-center justify-end pl-1">
            {inlineTrailingSlot}
          </div>
        </div>
        {error && <p className="w-full px-1 text-center text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }

  if (variant === 'panel') {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 py-5 shadow-sm">
        {canRemove && (
          <button type="button" onClick={onRemove} className="absolute top-5 right-4 z-10 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors" aria-label="Удалить вариант обрезки">
            <X size={18} />
          </button>
        )}
        <div className="px-4 space-y-4">
          {typeof panelIndex === 'number' && <p className="pr-12 text-sm font-medium text-neutral-800 dark:text-neutral-100">Вариант {panelIndex}</p>}
          <TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={error} size="default" />
          <FadeControls segment={segment} onUpdate={onUpdate} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative">
      {canRemove && (
        <button type="button" onClick={onRemove} className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors" aria-label="Удалить вариант обрезки">
          <X size={18} />
        </button>
      )}
      <div className="space-y-4">
        <TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={error} size="default" />
        <FadeControls segment={segment} onUpdate={onUpdate} />
      </div>
    </div>
  )
}
