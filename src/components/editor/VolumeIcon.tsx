// Динамик: с крестиком, когда звук выключен, и с волной — когда включён
export function VolumeIcon({ muted, size }: { muted: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#8a8a8a" />
      {muted ? (
        <>
          <line x1="18" y1="9" x2="23" y2="15" stroke="#8a8a8a" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="23" y1="9" x2="18" y2="15" stroke="#8a8a8a" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <path d="M16 8c1.5 1.5 1.5 6.5 0 8" stroke="#8a8a8a" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  )
}
