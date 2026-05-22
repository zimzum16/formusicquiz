import { useState } from 'react';
import { Search, Music, ExternalLink, Headphones, Radio, Play, Youtube } from 'lucide-react';

const mockResults = [
  { artist: 'The Weeknd', title: 'Blinding Lights', album: 'After Hours', year: '2020', cover: 'https://images.pexels.com/photos/1626481/pexels-photo-1626481.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' },
  { artist: 'Dua Lipa', title: 'Levitating', album: 'Future Nostalgia', year: '2020', cover: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' },
  { artist: 'Billie Eilish', title: 'bad guy', album: 'WHEN WE ALL FALL ASLEEP', year: '2019', cover: 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' },
];

type Track = typeof mockResults[0];

const StreamStat = ({ name, value, color, icon }: { name: string; value: string; color: string; icon: React.ReactNode }) => (
  <div className={`flex items-center justify-between p-3 rounded-xl ${color}`}>
    <div className="flex items-center gap-2.5">
      {icon}
      <span className="text-sm font-medium text-gray-700">{name}</span>
    </div>
    <span className="text-sm font-semibold text-gray-900">{value}</span>
  </div>
);

export default function SongInfo() {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<Track | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(e.target.value.length > 1);
    setSelected(null);
  };

  const selectTrack = (track: Track) => {
    setSelected(track);
    setQuery(`${track.artist} — ${track.title}`);
    setShowResults(false);
  };

  return (
    <main className="pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            Информация о песне
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Введите название песни — сервис найдёт её на Genius и соберёт данные о прослушиваниях.
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Название песни…"
            className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-900 placeholder-gray-400 text-base transition"
          />

          {/* Dropdown results */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-10 overflow-hidden">
              {mockResults
                .filter(t => `${t.artist} ${t.title}`.toLowerCase().includes(query.toLowerCase()))
                .map((t, i) => (
                  <button
                    key={i}
                    onClick={() => selectTrack(t)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-left group"
                  >
                    <img src={t.cover} alt={t.title} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-sky-600 transition-colors">{t.title}</p>
                      <p className="text-gray-500 text-xs">{t.artist} · {t.album} · {t.year}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Sp</span>
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Ya</span>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Selected track detail */}
        {selected && (
          <div className="mt-6 space-y-5 animate-fade-in">
            {/* Track card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-5">
                <img
                  src={selected.cover}
                  alt={selected.title}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
                  <p className="text-gray-600 font-medium">{selected.artist}</p>
                  <p className="text-gray-400 text-sm">{selected.album} · {selected.year}</p>
                </div>
              </div>

              <a
                href="#"
                className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 text-sm font-medium transition-colors"
              >
                <ExternalLink size={14} />
                Открыть текст на Genius
              </a>
            </div>

            {/* Streaming stats */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Статистика прослушиваний</h3>
              <div className="space-y-2">
                <StreamStat
                  name="Spotify"
                  value="3.2 млрд"
                  color="bg-green-50"
                  icon={<Headphones size={16} className="text-green-600" />}
                />
                <StreamStat
                  name="Yandex Музыка"
                  value="48.5 млн"
                  color="bg-red-50"
                  icon={<Radio size={16} className="text-red-500" />}
                />
                <StreamStat
                  name="YouTube"
                  value="890 млн просмотров"
                  color="bg-rose-50"
                  icon={<Youtube size={16} className="text-rose-600" />}
                />
                <StreamStat
                  name="Last.fm"
                  value="62.1 млн скроблингов"
                  color="bg-orange-50"
                  icon={<Play size={16} className="text-orange-500" />}
                />
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selected && !showResults && query.length === 0 && (
          <div className="mt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
              <Music size={28} className="text-sky-400" />
            </div>
            <p className="text-gray-400">Введите название, чтобы начать поиск</p>
          </div>
        )}
      </div>
    </main>
  );
}
