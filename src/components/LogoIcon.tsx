// Логотип trackslice: волна с вырезанным фрагментом между пунктирными линиями.
// Пресеты подобраны под размер: чем мельче иконка, тем ярче столбики и толще линии
const PRESETS = {
  hero: { width: 46, height: 30, dim: 0.14, stroke: 1.3, dash: '2.5 2', lineOpacity: '.8', inset: 1 },
  nav:  { width: 21, height: 14, dim: 0.4,  stroke: 1.5, dash: '3 2',   lineOpacity: '.85', inset: 0 },
  card: { width: 18, height: 12, dim: 0.25, stroke: 2,   dash: '3 2',   lineOpacity: '.9', inset: 0 },
}

export function LogoIcon({ variant }: { variant: keyof typeof PRESETS }) {
  const p = PRESETS[variant]
  const dim = `rgba(255,255,255,${p.dim})`
  const cut = (x: number) => (
    <line x1={x} y1={p.inset} x2={x} y2={40 - p.inset} stroke="#2DD4BF" strokeWidth={p.stroke} strokeDasharray={p.dash} opacity={p.lineOpacity}/>
  )
  return (
    <svg width={p.width} height={p.height} viewBox="0 0 60 40" fill="none">
      <rect x="1"  y="12" width="3.5" height="16" rx="1.75" fill={dim}/>
      <rect x="7"  y="7"  width="3.5" height="26" rx="1.75" fill={dim}/>
      <rect x="13" y="14" width="3.5" height="12" rx="1.75" fill={dim}/>
      {cut(19.5)}
      <g transform="translate(0,-6)">
        <rect x="21" y="11" width="3.5" height="24" rx="1.75" fill="#2DD4BF"/>
        <rect x="27" y="5"  width="3.5" height="36" rx="1.75" fill="#2DD4BF"/>
        <rect x="33" y="10" width="3.5" height="26" rx="1.75" fill="#2DD4BF"/>
        <rect x="39" y="14" width="3.5" height="18" rx="1.75" fill="#2DD4BF" opacity=".8"/>
      </g>
      {cut(45.5)}
      <rect x="47" y="15" width="3.5" height="10" rx="1.75" fill={dim}/>
      <rect x="53" y="10" width="3.5" height="20" rx="1.75" fill={dim}/>
    </svg>
  )
}
