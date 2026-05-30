import { Scissors, Loader2 } from 'lucide-react'

interface ProcessButtonProps {
  onProcess: () => void
  isProcessing: boolean
  disabled: boolean
  fragmentCount: number
}

export function ProcessButton({ onProcess, isProcessing, disabled, fragmentCount }: ProcessButtonProps) {
  const many = fragmentCount >= 2
  const idleLabel = many ? 'Обрезать фрагменты' : 'Обрезать фрагмент'
  const processingLabel = many ? 'Обработка фрагментов…' : 'Обработка фрагмента…'
  return (
    <button
      type="button"
      onClick={onProcess}
      disabled={disabled || isProcessing}
      className="mx-auto flex shrink-0 items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium transition-colors shadow-sm disabled:cursor-not-allowed"
    >
      {isProcessing ? (
        <>
          <Loader2 size={18} className="animate-spin shrink-0" aria-hidden />
          <span className="text-sm">{processingLabel}</span>
        </>
      ) : (
        <>
          <Scissors size={18} className="shrink-0" aria-hidden />
          <span className="text-sm">{idleLabel}</span>
        </>
      )}
    </button>
  )
}
