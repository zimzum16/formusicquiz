import { useState } from 'react';
import Navbar from './components/Navbar';
import { lang } from './i18n';
import Home from './pages/Home';
import SongInfo from './pages/SongInfo';
import Editor from './pages/Editor';
import Pricing from './pages/Pricing';

export type Page = 'home' | 'song-info' | 'editor' | 'pricing';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigate = (page: Page) => setCurrentPage(page);

  const isHome = currentPage === 'home' || currentPage === 'pricing' || currentPage === 'editor';

  return (
    <div className="min-h-screen bg-[#080809] font-sans antialiased py-0 sm:py-8 flex flex-col">
      <div className={`w-full mx-auto bg-black overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,.6)] ${isHome ? '' : 'max-w-[1060px] sm:rounded-[20px]'}`}>
        {currentPage !== 'home' && <Navbar currentPage={currentPage} navigate={navigate} />}
        {currentPage === 'home' && <Home navigate={navigate} />}
        {currentPage === 'song-info' && <SongInfo />}
        {currentPage === 'editor' && <Editor />}
        {currentPage === 'pricing' && <Pricing navigate={navigate} />}
      </div>
      <footer className="mt-auto pt-6 pb-4 flex flex-col items-center gap-2" style={{ color: 'rgba(255,255,255,.45)', fontSize: '12px', fontFamily: 'Montserrat, sans-serif' }}>
        <div className="flex items-center gap-3">
          <a
            href="https://trackslice.ru"
            style={{
              textDecoration: 'none',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: lang === 'ru' ? '#2DD4BF' : 'rgba(255,255,255,.35)',
              padding: '5px 12px',
              borderRadius: 8,
              border: `1px solid ${lang === 'ru' ? 'rgba(45,212,191,.4)' : 'rgba(255,255,255,.08)'}`,
              background: lang === 'ru' ? 'rgba(45,212,191,.08)' : 'rgba(255,255,255,.03)',
              transition: 'opacity .2s',
            }}
            className="hover:opacity-80"
          >
            RU
          </a>
          <a
            href="https://t.me/zimzum16"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center transition-opacity hover:opacity-60"
            style={{ color: 'rgba(255,255,255,.45)', textDecoration: 'none', lineHeight: 0 }}
          >
            <img src="/tg-icon.png" width={36} height={36} alt="" aria-hidden />
          </a>
          <a
            href="https://en.trackslice.ru"
            style={{
              textDecoration: 'none',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: lang === 'en' ? '#2DD4BF' : 'rgba(255,255,255,.35)',
              padding: '5px 12px',
              borderRadius: 8,
              border: `1px solid ${lang === 'en' ? 'rgba(45,212,191,.4)' : 'rgba(255,255,255,.08)'}`,
              background: lang === 'en' ? 'rgba(45,212,191,.08)' : 'rgba(255,255,255,.03)',
              transition: 'opacity .2s',
            }}
            className="hover:opacity-80"
          >
            EN
          </a>
        </div>
        <span>© {new Date().getFullYear()} ZimZum Production</span>
      </footer>
    </div>
  );
}

export default App;
