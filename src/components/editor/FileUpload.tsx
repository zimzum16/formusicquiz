import { useState, useRef } from 'react'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  uploadProgress: number
  onReset?: () => void
}

const SANS: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif' }

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

  if (isComplete) {
    return (
      <div className="fixed top-[64px] left-1/2 -translate-x-1/2 z-[60] flex flex-wrap items-center justify-center gap-3 py-2">
        {onReset && (
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = ''
              onReset()
              queueMicrotask(() => fileInputRef.current?.click())
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/30 text-white text-[13px] font-bold transition-colors hover:brightness-110 shadow-lg"
            style={{ ...SANS, background: 'rgba(18,18,22,.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 4px 24px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <polyline points="17,8 12,3 7,8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Загрузить другой
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".mp3" onChange={handleInputChange} className="hidden" />
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      className="rounded-[18px] border-2 border-dashed p-10 text-center transition-all"
      style={{
        borderColor: isDragging ? '#2DD4BF' : 'rgba(255,255,255,.15)',
        background: isDragging ? 'rgba(45,212,191,.06)' : 'rgba(24,24,28,.5)',
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 opacity-40">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        <polyline points="17,8 12,3 7,8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="3" x2="12" y2="15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="px-6 py-3 rounded-full text-[#06231f] font-extrabold text-[13px] uppercase tracking-[0.08em] disabled:opacity-40 transition-opacity mb-3"
        style={{ background: '#2DD4BF', ...SANS }}
      >
        {isUploading ? 'Загрузка...' : 'Загрузить файл'}
      </button>

      <p className="text-[13px] text-[#8a8a8a] mb-1" style={SANS}>или перетащите файл сюда</p>
      <p className="text-[11px] text-[#8a8a8a]/60" style={SANS}>Только .mp3, максимум 50 МБ</p>

      {isUploading && (
        <div className="mt-5 max-w-xs mx-auto">
          <div className="h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: '#2DD4BF' }} />
          </div>
          <p className="mt-2 text-[12px] text-[#8a8a8a]" style={SANS}>{uploadProgress}%</p>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".mp3" onChange={handleInputChange} className="hidden" />
    </div>
  )
}
