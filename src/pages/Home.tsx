import { useState } from 'react';
import { Search, Scissors, Check, Music, Headphones, Radio, Play, ArrowRight } from 'lucide-react';
import { Page } from '../App';

interface HomeProps {
  navigate: (page: Page) => void;
}

const mockTracks = [
  { artist: 'The Weeknd', title: 'Blinding Lights', album: 'After Hours', year: '2020' },
  { artist: 'Dua Lipa', title: 'Levitating', album: 'Future Nostalgia', year: '2020' },
  { artist: 'Billie Eilish', title: 'bad guy', album: 'WHEN WE ALL FALL ASLEEP', year: '2019' },
];

const ServiceIcon = ({ name, color }: { name: string; color: string }) => (
  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{name}</span>
);

export default function Home({ navigate }: HomeProps) {
  const [query, setQuery] = useState('');

  return (
    <main>
      {/* Hero — Song Search */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sky-50/60 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Music size={13} />
            Powered by Genius &amp; Last.fm
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            Узнай всё о песне<br />
            <span className="text-sky-500">за пару кликов</span>
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Введи название песни и получи информацию с Genius и статистику прослушиваний со всех платформ.
          </p>

          <div className="relative max-w-xl mx-auto mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Название песни или исполнитель…"
              className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-900 placeholder-gray-400 text-base transition"
            />
          </div>

          <button
            onClick={() => navigate('song-info')}
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            Найти песню
            <ArrowRight size={16} />
          </button>

          {/* Mock track cards */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {mockTracks.map((t, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center flex-shrink-0">
                    <Music size={16} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-sky-600 transition-colors">{t.title}</p>
                    <p className="text-gray-500 text-xs">{t.artist}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{t.album} · {t.year}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <ServiceIcon name="Spotify" color="bg-green-100 text-green-700" />
                  <ServiceIcon name="Yandex" color="bg-red-100 text-red-700" />
                  <ServiceIcon name="YouTube" color="bg-rose-100 text-rose-700" />
                  <ServiceIcon name="Last.fm" color="bg-orange-100 text-orange-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audio Editor Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Scissors size={13} />
                Аудио редактор
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
                Обрежь и подготовь аудио
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Загрузи трек, обозначь нужные фрагменты и создай точный отрезок под подкаст или рилс.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Поддержка MP3 до 50 МБ',
                  'Визуальная вейв-форма с маркерами',
                  'Нарастание и затухание звука',
                  'Несколько фрагментов за раз',
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-teal-600" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('editor')}
                className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                Попробовать редактор
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-white mb-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-3">
                  <Headphones size={22} className="text-teal-500" />
                </div>
                <p className="text-gray-700 font-medium mb-1">Загрузите файл MP3 до 50 МБ</p>
                <p className="text-gray-400 text-sm mb-4">Перетащите или нажмите для выбора</p>
                <button className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">
                  Загрузить файл
                </button>
              </div>

              {/* Mock waveform */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="relative h-16 flex items-end gap-0.5 mb-3">
                  {Array.from({ length: 60 }, (_, i) => {
                    const h = 20 + Math.sin(i * 0.4) * 15 + Math.random() * 25;
                    const inRange = i >= 15 && i <= 40;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm transition-colors ${inRange ? 'bg-teal-400' : 'bg-gray-200'}`}
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>0:00</span>
                  <span className="text-teal-600 font-medium">Выделенный фрагмент: 0:15 — 0:40</span>
                  <span>1:00</span>
                </div>
                <div className="mt-3 flex justify-center">
                  <button className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                    <Scissors size={14} />
                    Обрезать
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            Выберите удобный план
          </h2>
          <p className="text-gray-500 text-lg mb-12">Начните бесплатно — обновитесь когда будете готовы</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left">
              <div className="flex items-center gap-2 mb-4">
                <Radio size={18} className="text-gray-500" />
                <span className="font-semibold text-gray-900">Бесплатный</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">0 ₽</p>
              <p className="text-gray-400 text-sm mb-6">навсегда</p>
              <p className="text-gray-600 text-sm mb-6">150 песен в месяц · Базовый функционал</p>
              <button
                onClick={() => navigate('song-info')}
                className="w-full py-2.5 border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 font-medium rounded-xl text-sm transition-colors"
              >
                Попробовать бесплатно
              </button>
            </div>

            <div className="bg-sky-500 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow text-left relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                Популярный
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Play size={18} className="text-sky-100" />
                <span className="font-semibold text-white">Полугодовой</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">X ₽</p>
              <p className="text-sky-200 text-sm mb-6">за 6 месяцев</p>
              <p className="text-sky-100 text-sm mb-6">1000 песен · Приоритетная обработка</p>
              <button
                onClick={() => navigate('pricing')}
                className="w-full py-2.5 bg-white hover:bg-sky-50 text-sky-600 font-semibold rounded-xl text-sm transition-colors"
              >
                Выбрать план
              </button>
            </div>
          </div>

          <p className="text-gray-500 text-sm">
            Уже есть аккаунт?{' '}
            <button
              onClick={() => navigate('song-info')}
              className="text-sky-500 hover:text-sky-600 font-medium transition-colors"
            >
              Войти
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
