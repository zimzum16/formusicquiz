import { useState, useRef } from 'react'
import { Upload, CheckCircle2 } from 'lucide-react'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  uploadProgress: number
  hasFile: boolean
  onReset?: () => void
}

export function FileUpload({ onFileUpload, uploadProgress, onReset }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileUpload(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileUpload(file)
  }

  const isUploading = uploadProgress > 0 && uploadProgress < 100
  const isComplete = uploadProgress === 100

  return (
    <div className="mx-auto !mt-[50px] w-full max-w-6xl space-y-4">
      <div className={isComplete ? 'flex w-full flex-row flex-wrap items-center justify-center gap-3' : ''}>
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          className={`rounded-2xl border-2 border-dashed transition-all ${
            isComplete
              ? 'inline-flex flex-wrap items-center justify-center gap-2 px-3 py-2 sm:py-2.5'
              : 'p-8'
          } ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : isComplete
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50'
          }`}
        >
          <div className={isComplete ? 'flex min-h-0 min-w-0 items-center justify-center gap-2' : 'space-y-4 text-center'}>
            {isComplete ? (
              <>
                <CheckCircle2 size={22} className="shrink-0 text-green-600 dark:text-green-400" aria-hidden />
                <p className="truncate text-sm font-medium text-green-700 dark:text-green-300">
                  Файл успешно загружен
                </p>
              </>
            ) : (
              <>
                <Upload size={48} className="mx-auto text-neutral-400 dark:text-neutral-600" />
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white font-medium transition-colors shadow-sm"
                  >
                    {isUploading ? 'Загрузка...' : 'Загрузить файл'}
                  </button>
                  <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                    или перетащите файл сюда
                  </p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  Только .mp3, максимум 50 МБ
                </p>
              </>
            )}

            {!isComplete && isUploading && (
              <div className="w-full max-w-xs mx-auto">
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{uploadProgress}%</p>
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept=".mp3" onChange={handleInputChange} className="hidden" />
        </div>

        {isComplete && onReset && (
          <button
            type="button"
            className="flex shrink-0 items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-sm"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = ''
              onReset()
              queueMicrotask(() => fileInputRef.current?.click())
            }}
          >
            <Upload size={18} aria-hidden />
            <span className="text-sm">Загрузить другой файл</span>
          </button>
        )}
      </div>
    </div>
  )
}
