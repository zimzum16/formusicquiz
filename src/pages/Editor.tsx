import { useRef, useState, useEffect, type ReactNode, type RefObject } from 'react'
import { t } from '../i18n'
import { useAudioEditor } from '../hooks/useAudioEditor'
import { AudioPlayer } from '../components/editor/AudioPlayer'
import { WaveformDisplay } from '../components/editor/WaveformDisplay'
import { TrimControls } from '../components/editor/TrimControls'
import { MultiTrimPanel } from '../components/editor/MultiTrimPanel'
import { ProcessButton } from '../components/editor/ProcessButton'
import { ProcessedResults } from '../components/editor/ProcessedResults'
import { TrackSummary } from '../components/editor/TrackSummary'
import { FileUpload } from '../components/editor/FileUpload'
import { SongStructurePanel } from '../components/editor/SongStructurePanel'
import type { AudioFile, TrimSegment } from '../types/audio'
import type { SongMarker } from '../lib/songStructure'

const CENTERED = 'max-w-[1060px] mx-auto w-full px-4 sm:px-6 lg:px-8'

interface SegmentWaveformProps {
  audioFile: AudioFile
  segment: TrimSegment
  canRemove: boolean
  peaks: Float32Array | null
  markers: SongMarker[]
  isAnalyzing: boolean
  audioRef: RefObject<HTMLAudioElement | null>
  currentTime: number
  onSeek: (t: number) => void
  onUpdate: (updates: Partial<TrimSegment>) => void
  onRemove: () => void
  inlineTrailingSlot?: ReactNode
}

// Waveform одного фрагмента со своим плеером, разметкой песни и панелью обрезки
function SegmentWaveform({
  audioFile, segment, canRemove, peaks, markers, isAnalyzing,
  audioRef, currentTime, onSeek, onUpdate, onRemove, inlineTrailingSlot,
}: SegmentWaveformProps) {
  const range = { startTime: segment.startTime, endTime: segment.endTime }
  const fade = { fadeIn: segment.fadeIn, fadeOut: segment.fadeOut, fadeInDuration: segment.fadeInDuration, fadeOutDuration: segment.fadeOutDuration }
  return (
    <WaveformDisplay
      audioFile={audioFile}
      currentTime={currentTime}
      audioRef={audioRef}
      onSeek={onSeek}
      peaks={peaks}
      playbackEnvelope={{ range, fade }}
      trimRange={range}
      trimFade={fade}
      onTrimRangeChange={onUpdate}
      markers={markers}
      bottomSlot={
        <SongStructurePanel
          markers={markers}
          isAnalyzing={isAnalyzing}
          duration={audioFile.duration}
          onApplySegment={(s, e) => onUpdate({ startTime: s, endTime: e })}
        />
      }
      playToolbar={(playBtn, volumeSlot) => (
        <div className={CENTERED}>
          <TrimControls
            variant="inline"
            segment={segment}
            audioFile={audioFile}
            canRemove={canRemove}
            onUpdate={onUpdate}
            onRemove={onRemove}
            playSlot={playBtn}
            volumeSlot={volumeSlot}
            inlineTrailingSlot={inlineTrailingSlot}
          />
        </div>
      )}
    />
  )
}

export default function Editor() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioRef2 = useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentTime2, setCurrentTime2] = useState(0)
  const prevSegmentCountRef = useRef(0)

  const {
    audioFile,
    segments,
    waveformPeaks,
    isProcessing,
    processedFiles,
    uploadProgress,
    error,
    handleFileUpload,
    addSegment,
    removeSegment,
    updateSegment,
    processAudio,
    reset,
    songMarkers,
    isAnalyzingStructure,
  } = useAudioEditor()

  useEffect(() => {
    if (audioFile?.url) { setCurrentTime(0); setCurrentTime2(0) }
  }, [audioFile?.url])

  useEffect(() => {
    const n = segments.length
    if (n > prevSegmentCountRef.current && audioFile) {
      setCurrentTime2(0)
      const el2 = audioRef2.current
      if (el2) { el2.pause(); el2.currentTime = 0 }
    }
    prevSegmentCountRef.current = n
  }, [segments.length, audioFile])

  const seg0 = segments[0]
  const seg1 = segments[1]

  // Общее для обоих фрагментов
  const waveformProps = audioFile && {
    audioFile,
    canRemove: segments.length > 1,
    peaks: waveformPeaks,
    markers: songMarkers,
    isAnalyzing: isAnalyzingStructure,
  }

  return (
    <div className="py-8 space-y-4">
      <div className={`${CENTERED} space-y-4`}>
        {error && (
          <div className="p-4 rounded-[14px] border border-red-500/30 bg-red-500/10">
            <p className="text-red-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{error}</p>
          </div>
        )}

        <FileUpload
          onFileUpload={handleFileUpload}
          uploadProgress={uploadProgress}
          onReset={reset}
        />

        {audioFile && (
          <>
            <TrackSummary audioFile={audioFile} />
            <div className="rounded-[18px] border border-white/[0.1] overflow-hidden" style={{ background: 'rgba(24,24,28,.78)' }}>
              <AudioPlayer ref={audioRef} audioFile={audioFile} onTimeUpdate={setCurrentTime} />
            </div>
            {seg1 && (
              <div className="rounded-[18px] border border-white/[0.1] overflow-hidden" style={{ background: 'rgba(24,24,28,.78)' }}>
                <AudioPlayer ref={audioRef2} audioFile={audioFile} onTimeUpdate={setCurrentTime2} />
              </div>
            )}
          </>
        )}
      </div>

      {waveformProps && seg0 && (
        <SegmentWaveform
          {...waveformProps}
          segment={seg0}
          audioRef={audioRef}
          currentTime={currentTime}
          onSeek={setCurrentTime}
          onUpdate={(updates) => updateSegment(seg0.id, updates)}
          onRemove={() => removeSegment(seg0.id)}
        />
      )}

      {waveformProps && seg1 && (
        <SegmentWaveform
          key={seg1.id}
          {...waveformProps}
          segment={seg1}
          audioRef={audioRef2}
          currentTime={currentTime2}
          onSeek={setCurrentTime2}
          onUpdate={(updates) => updateSegment(seg1.id, updates)}
          onRemove={() => removeSegment(seg1.id)}
          inlineTrailingSlot={
            <button
              type="button"
              onClick={() => removeSegment(seg1.id)}
              className="text-sm font-medium text-[#2DD4BF] hover:opacity-70 transition-opacity"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
              aria-label={t.close}
            >
              {t.close}
            </button>
          }
        />
      )}

      {audioFile && (
        <div className={`${CENTERED} space-y-4`}>
          <MultiTrimPanel
            segments={segments}
            audioFile={audioFile}
            onAddSegment={addSegment}
            onRemoveSegment={removeSegment}
            onUpdateSegment={updateSegment}
          />

          <ProcessButton
            onProcess={processAudio}
            isProcessing={isProcessing}
            disabled={segments.length === 0}
            fragmentCount={segments.length}
          />

          {processedFiles.length > 0 && (
            <ProcessedResults files={processedFiles} />
          )}
        </div>
      )}
    </div>
  )
}
