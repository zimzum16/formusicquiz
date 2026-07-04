import { useRef, useState, useEffect } from 'react'
import { useAudioEditor } from '../hooks/useAudioEditor'
import { AudioPlayer } from '../components/editor/AudioPlayer'
import { WaveformDisplay } from '../components/editor/WaveformDisplay'
import { TrimControls } from '../components/editor/TrimControls'
import { MultiTrimPanel } from '../components/editor/MultiTrimPanel'
import { ProcessButton } from '../components/editor/ProcessButton'
import { ProcessedResults } from '../components/editor/ProcessedResults'
import { SongInfo } from '../components/editor/SongInfo'
import { FileUpload } from '../components/editor/FileUpload'
import { SongStructurePanel } from '../components/editor/SongStructurePanel'

export default function Editor() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioRef2 = useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentTime2, setCurrentTime2] = useState(0)
  const prevSegmentCountRef = useRef(0)

  const {
    audioFile,
    segments,
    sharedDecodedBuffer,
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

  const playbackEnvelope = seg0 ? {
    range: { startTime: seg0.startTime, endTime: seg0.endTime },
    fade: { fadeIn: seg0.fadeIn, fadeOut: seg0.fadeOut, fadeInDuration: seg0.fadeInDuration, fadeOutDuration: seg0.fadeOutDuration },
  } : null

  const playbackEnvelope2 = seg1 ? {
    range: { startTime: seg1.startTime, endTime: seg1.endTime },
    fade: { fadeIn: seg1.fadeIn, fadeOut: seg1.fadeOut, fadeInDuration: seg1.fadeInDuration, fadeOutDuration: seg1.fadeOutDuration },
  } : null

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-4">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Обрезка и редактирование
        </h1>
      </div>

      {error && (
        <div className="p-4 rounded-[14px] border border-red-500/30 bg-red-500/10">
          <p className="text-red-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{error}</p>
        </div>
      )}

      <FileUpload
        onFileUpload={handleFileUpload}
        uploadProgress={uploadProgress}
        hasFile={!!audioFile}
        onReset={reset}
      />

      {audioFile && (
        <>
          <div className="space-y-4">
            <SongInfo audioFile={audioFile} />

            <div className="rounded-[18px] border border-white/[0.1] overflow-hidden" style={{ background: 'rgba(24,24,28,.78)' }}>
              <AudioPlayer ref={audioRef} audioFile={audioFile} onTimeUpdate={setCurrentTime} />
            </div>
            {seg1 && (
              <div className="rounded-[18px] border border-white/[0.1] overflow-hidden" style={{ background: 'rgba(24,24,28,.78)' }}>
                <AudioPlayer ref={audioRef2} audioFile={audioFile} onTimeUpdate={setCurrentTime2} />
              </div>
            )}

            {seg0 && (
              <WaveformDisplay
                  audioFile={audioFile}
                  currentTime={currentTime}
                  audioRef={audioRef}
                  onSeek={setCurrentTime}
                  prefetchedBuffer={sharedDecodedBuffer}
                  playbackEnvelope={playbackEnvelope}
                  trimRange={{ startTime: seg0.startTime, endTime: seg0.endTime }}
                  trimFade={{ fadeIn: seg0.fadeIn, fadeOut: seg0.fadeOut, fadeInDuration: seg0.fadeInDuration, fadeOutDuration: seg0.fadeOutDuration }}
                  onTrimRangeChange={(r) => updateSegment(seg0.id, r)}
                  markers={songMarkers}
                  bottomSlot={
                    <SongStructurePanel
                      markers={songMarkers}
                      isAnalyzing={isAnalyzingStructure}
                      duration={audioFile.duration}
                      onApplySegment={(s, e) => updateSegment(seg0.id, { startTime: s, endTime: e })}
                    />
                  }
                  playToolbar={(playBtn, volumeSlot) => (
                    <TrimControls
                      variant="inline"
                      segment={seg0}
                      audioFile={audioFile}
                      canRemove={segments.length > 1}
                      onUpdate={(updates) => updateSegment(seg0.id, updates)}
                      onRemove={() => removeSegment(seg0.id)}
                      playSlot={playBtn}
                      volumeSlot={volumeSlot}
                    />
                  )}
                />
            )}

            {seg1 && (
              <WaveformDisplay
                  key={seg1.id}
                  audioFile={audioFile}
                  currentTime={currentTime2}
                  audioRef={audioRef2}
                  onSeek={setCurrentTime2}
                  prefetchedBuffer={sharedDecodedBuffer}
                  playbackEnvelope={playbackEnvelope2}
                  trimRange={{ startTime: seg1.startTime, endTime: seg1.endTime }}
                  trimFade={{ fadeIn: seg1.fadeIn, fadeOut: seg1.fadeOut, fadeInDuration: seg1.fadeInDuration, fadeOutDuration: seg1.fadeOutDuration }}
                  onTrimRangeChange={(r) => updateSegment(seg1.id, r)}
                  markers={songMarkers}
                  bottomSlot={
                    <SongStructurePanel
                      markers={songMarkers}
                      isAnalyzing={isAnalyzingStructure}
                      duration={audioFile.duration}
                      onApplySegment={(s, e) => updateSegment(seg1.id, { startTime: s, endTime: e })}
                    />
                  }
                  playToolbar={(playBtn, volumeSlot) => (
                    <TrimControls
                      variant="inline"
                      segment={seg1}
                      audioFile={audioFile}
                      canRemove={segments.length > 1}
                      onUpdate={(updates) => updateSegment(seg1.id, updates)}
                      onRemove={() => removeSegment(seg1.id)}
                      playSlot={playBtn}
                      volumeSlot={volumeSlot}
                      inlineTrailingSlot={
                        <button
                          type="button"
                          onClick={() => removeSegment(seg1.id)}
                          className="text-sm font-medium text-[#8a8a8a] hover:text-white transition-colors"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                          aria-label="Закрыть второй фрагмент"
                        >
                          Закрыть
                        </button>
                      }
                    />
                  )}
                />
            )}
          </div>

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
        </>
      )}
    </div>
  )
}
