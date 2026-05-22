import { useState } from 'react';
import { Music2, Menu, X } from 'lucide-react';
import { Page } from '../App';

interface NavbarProps {
  currentPage: Page;
  navigate: (page: Page) => void;
  isLoggedIn: boolean;
}

const navLinks: { label: string; page: Page }[] = [
  { label: 'О песне', page: 'song-info' },
  { label: 'Редактор', page: 'editor' },
  { label: 'Тарифы', page: 'pricing' },
];

export default function Navbar({ currentPage, navigate, isLoggedIn }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center group-hover:bg-sky-600 transition-colors">
              <Music2 size={18} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">SoundLens</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, page }) => (
              <button
                key={page}
                onClick={() => navigate(page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-sky-50 text-sky-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={() => navigate('profile')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 'profile'
                    ? 'bg-sky-50 text-sky-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Профиль
              </button>
            ) : (
              <button
                onClick={() => navigate('auth')}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Войти
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => { navigate(page); setMobileOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-sky-50 text-sky-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          {isLoggedIn ? (
            <button
              onClick={() => { navigate('profile'); setMobileOpen(false); }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Профиль
            </button>
          ) : (
            <button
              onClick={() => { navigate('auth'); setMobileOpen(false); }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
            >
              Войти
            </button>
          )}
        </div>
      )}
    </header>
  );
}
