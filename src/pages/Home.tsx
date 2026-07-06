import { Page } from '../App';

interface HomeProps {
  navigate: (page: Page) => void;
}

const WaveformIcon = ({ size = 46 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 30 / 46)} viewBox="0 0 60 40" fill="none">
    <rect x="1"  y="12" width="3.5" height="16" rx="1.75" fill="rgba(255,255,255,0.14)"/>
    <rect x="7"  y="7"  width="3.5" height="26" rx="1.75" fill="rgba(255,255,255,0.14)"/>
    <rect x="13" y="14" width="3.5" height="12" rx="1.75" fill="rgba(255,255,255,0.14)"/>
    <line x1="19.5" y1="1" x2="19.5" y2="39" stroke="#2DD4BF" strokeWidth="1.3" strokeDasharray="2.5 2" opacity=".8"/>
    <g transform="translate(0,-6)">
      <rect x="21" y="11" width="3.5" height="24" rx="1.75" fill="#2DD4BF"/>
      <rect x="27" y="5"  width="3.5" height="36" rx="1.75" fill="#2DD4BF"/>
      <rect x="33" y="10" width="3.5" height="26" rx="1.75" fill="#2DD4BF"/>
      <rect x="39" y="14" width="3.5" height="18" rx="1.75" fill="#2DD4BF" opacity=".8"/>
    </g>
    <line x1="45.5" y1="1" x2="45.5" y2="39" stroke="#2DD4BF" strokeWidth="1.3" strokeDasharray="2.5 2" opacity=".8"/>
    <rect x="47" y="15" width="3.5" height="10" rx="1.75" fill="rgba(255,255,255,0.14)"/>
    <rect x="53" y="10" width="3.5" height="20" rx="1.75" fill="rgba(255,255,255,0.14)"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="10" cy="10" r="6" stroke="#2DD4BF" strokeWidth="1.8"/>
    <path d="M15 15l4 4" stroke="#2DD4BF" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M10 7v3l2 1" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const SmallWaveformIcon = () => (
  <svg width="18" height="12" viewBox="0 0 60 40" fill="none">
    <rect x="1"  y="12" width="3.5" height="16" rx="1.75" fill="rgba(255,255,255,0.25)"/>
    <rect x="7"  y="7"  width="3.5" height="26" rx="1.75" fill="rgba(255,255,255,0.25)"/>
    <rect x="13" y="14" width="3.5" height="12" rx="1.75" fill="rgba(255,255,255,0.25)"/>
    <line x1="19.5" y1="0" x2="19.5" y2="40" stroke="#2DD4BF" strokeWidth="2" strokeDasharray="3 2" opacity=".9"/>
    <g transform="translate(0,-6)">
      <rect x="21" y="11" width="3.5" height="24" rx="1.75" fill="#2DD4BF"/>
      <rect x="27" y="5"  width="3.5" height="36" rx="1.75" fill="#2DD4BF"/>
      <rect x="33" y="10" width="3.5" height="26" rx="1.75" fill="#2DD4BF"/>
      <rect x="39" y="14" width="3.5" height="18" rx="1.75" fill="#2DD4BF" opacity=".8"/>
    </g>
    <line x1="45.5" y1="0" x2="45.5" y2="40" stroke="#2DD4BF" strokeWidth="2" strokeDasharray="3 2" opacity=".9"/>
    <rect x="47" y="15" width="3.5" height="10" rx="1.75" fill="rgba(255,255,255,0.25)"/>
    <rect x="53" y="10" width="3.5" height="20" rx="1.75" fill="rgba(255,255,255,0.25)"/>
  </svg>
);

const SongInfoPreview = () => (
  <img
    src="/preview-song-info.png"
    alt="О песне"
    style={{ width: '100%', borderRadius: 14, display: 'block' }}
  />
);

const EditorPreview = () => (
  <img
    src="/preview-editor.png"
    alt="Редактор"
    style={{ width: '100%', borderRadius: 14, display: 'block' }}
  />
);

export default function Home({ navigate }: HomeProps) {
  return (
    <main style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px 120px' }}>

        {/* Wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 96 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: '#0c0d10',
            border: '1px solid rgba(255,255,255,.09)',
            boxShadow: '0 0 0 1px rgba(45,212,191,.14), 0 20px 60px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', width: 70, height: 28,
              background: 'rgba(45,212,191,.09)',
              filter: 'blur(18px)', borderRadius: '50%',
            }} />
            <WaveformIcon size={46} />
          </div>

          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.05em', lineHeight: 1 }}>
            track<span style={{ color: '#2DD4BF' }}>slice</span>
          </div>

          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 11, color: '#3a3a3a',
            letterSpacing: '.2em', textTransform: 'uppercase',
          }}>
            cut · listen · discover
          </div>
        </div>

        {/* Two cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* О песне */}
          <div
            onClick={() => navigate('song-info')}
            style={{
              background: 'rgba(14,15,18,.95)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 24, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer', transition: 'border-color .2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,.25)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
          >
            <div style={{ padding: '32px 32px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(45,212,191,.12)',
                  border: '1px solid rgba(45,212,191,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SearchIcon />
                </div>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '.16em', textTransform: 'uppercase',
                  color: '#2DD4BF',
                }}>О песне</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', color: '#fff', marginBottom: 8, lineHeight: 1.2 }}>
                Всё о песне
              </h2>
              <p style={{ fontSize: 13, color: '#555', fontWeight: 500, lineHeight: 1.6 }}>
                Текст, аккорды, история создания, BPM, тональность — любая информация о треке в одном месте.
              </p>
            </div>
            <div style={{ padding: '0 20px 20px', flex: 1 }}>
              <SongInfoPreview />
            </div>
          </div>

          {/* Редактор */}
          <div
            onClick={() => navigate('editor')}
            style={{
              background: 'rgba(14,15,18,.95)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 24, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer', transition: 'border-color .2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,.25)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
          >
            <div style={{ padding: '32px 32px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(45,212,191,.12)',
                  border: '1px solid rgba(45,212,191,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <SmallWaveformIcon />
                </div>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '.16em', textTransform: 'uppercase',
                  color: '#2DD4BF',
                }}>Редактор</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', color: '#fff', marginBottom: 8, lineHeight: 1.2, marginTop: 8 }}>
                Вырежи фрагмент
              </h2>
              <p style={{ fontSize: 13, color: '#555', fontWeight: 500, lineHeight: 1.6 }}>
                Отметь начало и конец — получи нужный кусок трека. Без лишних шагов, прямо в приложении.
              </p>
            </div>
            <div style={{ padding: '0 20px 20px', flex: 1 }}>
              <EditorPreview />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
