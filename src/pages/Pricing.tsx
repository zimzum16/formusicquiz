import { Check, Zap, Star } from 'lucide-react';
import { Page } from '../App';

interface PricingProps {
  navigate: (page: Page) => void;
}

const freeFeatures = [
  '150 песен в месяц',
  'Распознавание названия и метаданных',
  'Базовый аудио редактор',
  'Экспорт одного фрагмента',
];

const proFeatures = [
  '1000 песен за полгода',
  'Приоритетная обработка',
  'Расширенные функции редактора',
  'Несколько фрагментов за раз',
  'Нарастание и затухание звука',
  'Экспорт в MP3 без ограничений',
];

const advantages = [
  { icon: '⚡', label: 'Мгновенное распознавание' },
  { icon: '🎯', label: 'Очередь без задержек' },
  { icon: '📥', label: 'Экспорт в MP3' },
];

export default function Pricing({ navigate }: PricingProps) {
  return (
    <main className="pt-16 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4">
            Выберите план для вашего ритма
          </h1>
          <p className="text-gray-500 text-lg">Начните бесплатно. Обновитесь, когда будете готовы.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">

          {/* Free */}
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Zap size={16} className="text-gray-500" />
              </div>
              <span className="font-semibold text-gray-900">Бесплатный</span>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">0 ₽</span>
              <span className="text-gray-400 text-sm ml-2">навсегда</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {freeFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={11} className="text-gray-500" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate('song-info')}
              className="w-full py-3 border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 font-semibold rounded-xl transition-colors"
            >
              Подключить бесплатно
            </button>
          </div>

          {/* Pro */}
          <div className="bg-gray-900 rounded-3xl p-8 shadow-xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
                    <Star size={15} className="text-white fill-white" />
                  </div>
                  <span className="font-semibold text-white">Полугодовой</span>
                </div>
                <span className="bg-sky-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Лучший выбор</span>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">X ₽</span>
                <span className="text-gray-400 text-sm ml-2">за 6 месяцев</span>
              </div>

              <ul className="space-y-3 mb-8">
                {proFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={11} className="text-sky-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('song-info')}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl transition-colors"
              >
                Подключить за X ₽ за 6 месяцев
              </button>
            </div>
          </div>
        </div>

        {/* Advantages */}
        <div className="bg-gray-50 rounded-3xl p-8 max-w-2xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide text-center mb-6">
            Что входит в платный план
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {advantages.map((a, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-sm font-medium text-gray-700">{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-10">
          Уже есть аккаунт?{' '}
          <button
            onClick={() => navigate('song-info')}
            className="text-sky-500 hover:text-sky-600 font-semibold transition-colors"
          >
            Войти
          </button>
        </p>
      </div>
    </main>
  );
}
