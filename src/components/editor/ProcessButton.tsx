import { Loader2, Scissors } from 'lucide-react'
import { t } from '../../i18n'

interface ProcessButtonProps {
  onProcess: () => void
  isProcessing: boolean
  disabled: boolean
  fragmentCount: number
}

export function ProcessButton({ onProcess, isProcessing, disabled, fragmentCount }: ProcessButtonProps) {
  const many = fragmentCount >= 2
  const idleLabel = many ? t.trim_many : t.trim_one
  const processingLabel = many ? t.processing_many : t.processing_one

  return (
    <div className="flex justify-center my-2">
      <button
        type="button"
        onClick={onProcess}
        disabled={disabled || isProcessing}
        className="flex shrink-0 items-center gap-2.5 disabled:opacity-40 transition-opacity"
        style={{
          background: '#2DD4BF',
          color: '#06231f',
          border: 'none',
          borderRadius: '980px',
          padding: '14px 36px',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 0 24px rgba(45,212,191,.25)',
        }}
      >
        {isProcessing ? (
          <>
            <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
            <span>{processingLabel}</span>
          </>
        ) : (
          <>
            <Scissors size={16} className="shrink-0" aria-hidden />
            <span>{idleLabel}</span>
          </>
        )}
      </button>
    </div>
  )
}
