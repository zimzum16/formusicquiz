import { Page } from '../App';

interface NavbarProps {
  currentPage: Page;
  navigate: (page: Page) => void;
}

export default function Navbar({ currentPage, navigate }: NavbarProps) {
  return (
    <header className="flex items-center justify-between px-5 sm:px-8 py-3.5 bg-black/70 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50">
      <button
        onClick={() => navigate('home')}
        className="flex items-center gap-2.5"
      >
        <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(150deg,#3ad0c4,#2b8af0)', boxShadow: '0 2px 10px rgba(43,138,240,.45)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V6l10-2v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6.5" cy="18" r="2.6" fill="#fff" />
            <circle cx="16.5" cy="14" r="2.6" fill="#fff" />
          </svg>
        </div>
        <span className="font-extrabold text-[18px] text-white tracking-[-0.01em]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          SoundLens
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
    </header>
  );
}
