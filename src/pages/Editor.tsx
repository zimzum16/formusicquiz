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

export default function Editor() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
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
  } = useAudioEditor()

  useEffect(() => {
    if (audioFile?.url) setCurrentTime(0)
  }, [audioFile?.url])

  // При добавлении нового сегмента — сбрасываем позицию воспроизведения
  useEffect(() => {
    const n = segments.length
    if (n > prevSegmentCountRef.current && audioFile) {
      setCurrentTime(0)
      const el = audioRef.current
      if (el) { el.pause(); el.currentTime = 0 }
    }
    prevSegmentCountRef.current = n
  }, [segments.length, audioFile])

  const seg0 = segments[0]
  const seg1 = segments[1]

  const playbackEnvelope = seg0 ? {
    range: { startTime: seg0.startTime, endTime: seg0.endTime },
    fade: { fadeIn: seg0.fadeIn, fadeOut: seg0.fadeOut, fadeInDuration: seg0.fadeInDuration, fadeOutDuration: seg0.fadeOutDuration },
  } : null

  return (
    <div className="w-full max-w-none px-4 py-8 sm:px-6 lg:px-10 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-light text-neutral-900 dark:text-white tracking-tight">
          Обрезка и редактирование песен онлайн
        </h1>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
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

            <AudioPlayer ref={audioRef} audioFile={audioFile} onTimeUpdate={setCurrentTime} />

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
                currentTime={currentTime}
                audioRef={audioRef}
                onSeek={setCurrentTime}
                prefetchedBuffer={sharedDecodedBuffer}
                playbackEnvelope={playbackEnvelope}
                playbackFadeEnvelope={false}
                showPlaybackVolume
                trimRange={{ startTime: seg1.startTime, endTime: seg1.endTime }}
                trimFade={{ fadeIn: seg1.fadeIn, fadeOut: seg1.fadeOut, fadeInDuration: seg1.fadeInDuration, fadeOutDuration: seg1.fadeOutDuration }}
                onTrimRangeChange={(r) => updateSegment(seg1.id, r)}
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
                        className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
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
