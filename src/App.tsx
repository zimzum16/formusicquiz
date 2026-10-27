import { useState } from 'react';
import Navbar from './components/Navbar';
import { lang, t } from './i18n';
import Home from './pages/Home';
import SongInfo from './pages/SongInfo';
import Editor from './pages/Editor';
import Pricing from './pages/Pricing';
import FeedbackModal from './components/FeedbackModal';

export type Page = 'home' | 'song-info' | 'editor' | 'pricing';

// Флаг-ссылка на версию сайта; текущий язык — ярче
function LangLink({ code, href, title }: { code: 'ru' | 'en'; href: string; title: string }) {
  return (
    <a
      href={href}
      title={title}
      style={{ opacity: lang === code ? 1 : 0.35, lineHeight: 0, transition: 'opacity .2s', textDecoration: 'none' }}
      className="hover:opacity-80"
    >
      <img src={`/flag-${code}.svg`} width={24} height={24} alt={code.toUpperCase()} />
    </a>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Новая страница всегда открывается сверху, а не на прокрутке предыдущей
  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

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
        <div className="flex items-center gap-5">
          <LangLink code="ru" href="https://trackslice.ru" title="Русский" />
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center transition-opacity hover:opacity-60"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
            aria-label={t.feedback_button}
            title={t.feedback_button}
          >
            <img src="/tg-icon.png" width={36} height={36} alt="" aria-hidden />
          </button>
          <LangLink code="en" href="https://en.trackslice.ru" title="English" />
        </div>
        <span>© {new Date().getFullYear()} ZimZum Production</span>
      </footer>
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}

export default App;
