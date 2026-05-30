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

  const labelCl = isCompact
    ? slimCol
      ? 'block mb-1 w-full text-center text-xs font-medium text-neutral-700 dark:text-neutral-300'
      : 'block mb-1 text-xs font-medium text-neutral-700 dark:text-neutral-300'
    : 'block mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300'

  const inputBase = 'box-border w-[14ch] max-w-full min-w-0 px-2.5 py-1.5 font-mono text-sm tabular-nums leading-none rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const inputCl = isCompact
    ? slimCol ? `${inputBase} text-center` : inputBase
    : 'box-border w-full max-w-[8ch] px-3 py-2.5 font-mono text-sm tabular-nums leading-none rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
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
      <label className={labelCl}>Начало</label>
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
      <label className={labelCl}>Конец</label>
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
    return (
      <div className={playSlot != null ? 'flex w-full min-w-0 flex-col items-center gap-2 mt-[30px]' : 'flex w-full min-w-0 flex-col items-center gap-2'}>
        <div dir="ltr" className={
          playSlot != null
            ? volumeSlot
              ? 'flex w-full min-w-0 items-center gap-x-3'
              : 'flex w-full min-w-0 flex-nowrap items-center justify-center gap-x-4 overflow-x-auto sm:gap-x-6 md:gap-x-8'
            : 'flex w-full min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:flex-nowrap sm:justify-center'
        }>
          {playSlot != null ? (
            volumeSlot ? (
              <>
                <div className="flex min-w-[7.125rem] w-[7.125rem] shrink-0 items-center justify-start">{volumeSlot}</div>
                <div className="flex min-w-0 flex-1 justify-center overflow-x-auto overflow-y-visible">
                  <div className="flex w-max min-w-0 shrink-0 flex-nowrap items-center justify-center gap-x-4 py-0.5 sm:gap-x-6 md:gap-x-8 lg:gap-x-10">
                    <div className="flex min-w-0 shrink justify-center px-1"><FadeInToolbarInline segment={segment} onUpdate={onUpdate} /></div>
                    <div className="shrink-0"><TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={null} size="compact" columns="start" /></div>
                    <div className="shrink-0">{playSlot}</div>
                    <div className="shrink-0"><TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={null} size="compact" columns="end" /></div>
                    <div className="flex min-w-0 shrink justify-center px-1"><FadeOutToolbarInline segment={segment} onUpdate={onUpdate} /></div>
                  </div>
                </div>
                <div className={inlineTrailingSlot ? 'flex min-w-[7.125rem] shrink-0 items-center justify-end pl-1' : 'min-w-[7.125rem] w-[7.125rem] shrink-0'}>
                  {inlineTrailingSlot}
                </div>
              </>
            ) : (
              <div className="flex w-full min-w-0 flex-nowrap items-center justify-center gap-x-4 overflow-x-auto sm:gap-x-6 md:gap-x-8">
                <div className="flex min-w-0 shrink justify-center px-1"><FadeInToolbarInline segment={segment} onUpdate={onUpdate} /></div>
                <div className="shrink-0"><TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={null} size="compact" columns="start" /></div>
                <div className="shrink-0">{playSlot}</div>
                <div className="shrink-0"><TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={null} size="compact" columns="end" /></div>
                <div className="flex min-w-0 shrink justify-center px-1"><FadeOutToolbarInline segment={segment} onUpdate={onUpdate} /></div>
              </div>
            )
          ) : (
            <TrimTimeFields segment={segment} handleStartTimeChange={handleStartTimeChange} handleEndTimeChange={handleEndTimeChange} error={error} size="compact" columns="both" />
          )}
        </div>
        {playSlot != null && error ? <p className="w-full px-1 text-center text-xs text-red-600 dark:text-red-400">{error}</p> : null}
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
