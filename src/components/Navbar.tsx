import { Page } from '../App';
import { LogoIcon } from './LogoIcon';

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
          <LogoIcon variant="nav" />
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
          track
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
          slicer
        </button>
      </nav>
      </div>
    </header>
  );
}
