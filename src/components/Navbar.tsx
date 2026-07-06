import { Page } from '../App';

interface NavbarProps {
  currentPage: Page;
  navigate: (page: Page) => void;
}

export default function Navbar({ currentPage, navigate }: NavbarProps) {
  return (
    <header className="bg-black/70 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50">
      <div className="max-w-[1060px] mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between">
      <button
        onClick={() => navigate('home')}
        className="flex items-center gap-2.5"
      >
        <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: '#0c0d10', border: '1px solid rgba(255,255,255,.09)', boxShadow: '0 0 0 1px rgba(45,212,191,.12), inset 0 1px 0 rgba(255,255,255,.06)' }}>
          <svg width="21" height="14" viewBox="0 0 60 40" fill="none">
            <rect x="1"  y="12" width="3.5" height="16" rx="1.75" fill="rgba(255,255,255,0.2)"/>
            <rect x="7"  y="7"  width="3.5" height="26" rx="1.75" fill="rgba(255,255,255,0.2)"/>
            <rect x="13" y="14" width="3.5" height="12" rx="1.75" fill="rgba(255,255,255,0.2)"/>
            <line x1="19.5" y1="0" x2="19.5" y2="40" stroke="#2DD4BF" strokeWidth="1.5" strokeDasharray="3 2" opacity=".85"/>
            <g transform="translate(0,-6)">
              <rect x="21" y="11" width="3.5" height="24" rx="1.75" fill="#2DD4BF"/>
              <rect x="27" y="5"  width="3.5" height="36" rx="1.75" fill="#2DD4BF"/>
              <rect x="33" y="10" width="3.5" height="26" rx="1.75" fill="#2DD4BF"/>
              <rect x="39" y="14" width="3.5" height="18" rx="1.75" fill="#2DD4BF" opacity=".8"/>
            </g>
            <line x1="45.5" y1="0" x2="45.5" y2="40" stroke="#2DD4BF" strokeWidth="1.5" strokeDasharray="3 2" opacity=".85"/>
            <rect x="47" y="15" width="3.5" height="10" rx="1.75" fill="rgba(255,255,255,0.2)"/>
            <rect x="53" y="10" width="3.5" height="20" rx="1.75" fill="rgba(255,255,255,0.2)"/>
          </svg>
        </div>
        <span className="font-extrabold text-[17px] tracking-[-0.025em]" style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff' }}>
          track<span style={{ color: '#2DD4BF' }}>slice</span>
        </span>
      </button>

      <nav className="flex items-center gap-1 bg-white/[0.07] p-1 rounded-full">
        <button
          onClick={() => navigate('song-info')}
          className="px-4 sm:px-5 py-2 rounded-full text-[13px] font-bold transition-all"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: '0.02em',
            background: currentPage === 'song-info' ? '#2DD4BF' : 'transparent',
            color: currentPage === 'song-info' ? '#06231f' : '#8a8a8a',
            boxShadow: currentPage === 'song-info' ? '0 0 14px rgba(45,212,191,.4)' : 'none',
          }}
        >
          О песне
        </button>
        <button
          onClick={() => navigate('editor')}
          className="px-4 sm:px-5 py-2 rounded-full text-[13px] font-bold transition-all"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: '0.02em',
            background: currentPage === 'editor' ? '#2DD4BF' : 'transparent',
            color: currentPage === 'editor' ? '#06231f' : '#8a8a8a',
            boxShadow: currentPage === 'editor' ? '0 0 14px rgba(45,212,191,.4)' : 'none',
          }}
        >
          Редактор
        </button>
      </nav>
      </div>
    </header>
  );
}
