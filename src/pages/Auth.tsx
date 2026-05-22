import { useState } from 'react';
import { Eye, EyeOff, Music2 } from 'lucide-react';
import { Page } from '../App';

interface AuthProps {
  navigate: (page: Page) => void;
  onLogin: () => void;
}

export default function Auth({ navigate, onLogin }: AuthProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
    navigate('profile');
  };

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Music2 size={22} className="text-white" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2 tracking-tight">
            Войти или создать аккаунт
          </h1>
          <p className="text-gray-500 text-sm text-center mb-7">
            Сохраняйте историю и управляйте подпиской
          </p>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Войти
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Зарегистрироваться
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Почта</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {tab === 'login' && (
                <div className="flex justify-end mt-1.5">
                  <button type="button" className="text-xs text-sky-500 hover:text-sky-600 font-medium transition-colors">
                    Забыли пароль?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md mt-2"
            >
              {tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">или</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Войти через Google
          </button>
        </div>
      </div>
    </main>
  );
}
