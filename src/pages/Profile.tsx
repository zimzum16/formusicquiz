import { useState } from 'react';
import { User, Mail, CreditCard, Music, Lock, LogOut, ChevronRight } from 'lucide-react';
import { Page } from '../App';

interface ProfileProps {
  navigate: (page: Page) => void;
  onLogout: () => void;
}

export default function Profile({ navigate, onLogout }: ProfileProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  const user = {
    name: 'Алексей Смирнов',
    email: 'alex@example.com',
    plan: 'Бесплатный',
    songsUsed: 8,
    songsTotal: 150,
  };

  const usagePct = (user.songsUsed / user.songsTotal) * 100;

  return (
    <main className="pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Профиль пользователя</h1>
          <p className="text-gray-500 text-sm">Управляйте аккаунтом и подпиской</p>
        </div>

        {/* User card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md">
              <span className="text-white text-xl font-bold">{user.name.charAt(0)}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{user.name}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Имя</p>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <Mail size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Почта</p>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <CreditCard size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Текущий тариф</p>
                <p className="text-sm font-medium text-gray-900">{user.plan}</p>
              </div>
              <button
                onClick={() => navigate('pricing')}
                className="text-xs text-sky-500 hover:text-sky-600 font-medium flex items-center gap-0.5 transition-colors flex-shrink-0"
              >
                Обновить <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Music size={16} className="text-sky-500" />
            <h2 className="font-semibold text-gray-900">Использование</h2>
          </div>
          <div className="flex items-end justify-between mb-2">
            <p className="text-gray-600 text-sm">Песен этого месяца</p>
            <p className="text-sm font-semibold text-gray-900">
              {user.songsUsed} / {user.songsTotal}
            </p>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {user.songsTotal - user.songsUsed} песен осталось до конца месяца
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-3">
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors">
              <Lock size={14} className="text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors flex-1">
              Сменить пароль
            </span>
            <ChevronRight size={14} className={`text-gray-400 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
          </button>

          {showPasswordForm && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Текущий пароль</label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Новый пароль</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Минимум 8 символов"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
              </div>
              <button className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors">
                Обновить пароль
              </button>
            </div>
          )}

          <div className="border-t border-gray-100" />

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl hover:bg-red-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors">
              <LogOut size={14} className="text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500 group-hover:text-red-600 transition-colors">
              Выйти из аккаунта
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
