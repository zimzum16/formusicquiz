import { useState } from 'react';
import {
  Search, Music, ExternalLink, Headphones, Radio, Play,
  Mic2, Users, Clock, Globe, Eye, ThumbsUp, Calendar,
  AudioLines, Video, ChevronRight,
} from 'lucide-react';
import { tracksApi, type SpotifyTrack, type TrackInfo } from '../lib/api';

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} млрд`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс.`;
  return String(n);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <span className="text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function ArtistList({ artists, label }: { artists: { name: string; url: string }[]; label: string }) {
  if (!artists.length) return null;
  return (
    <Row
      icon={<Users size={15} />}
      label={label}
      value={
        <span className="flex flex-wrap gap-x-2">
          {artists.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
              {a.name}
            </a>
          ))}
        </span>
      }
    />
  );
}

function RelatedList({ songs, label }: { songs: { title: string; artist: string; genius_url: string }[]; label: string }) {
  if (!songs.length) return null;
  return (
    <div className="text-sm">
      <p className="text-gray-500 mb-1 font-medium">{label}</p>
      <ul className="space-y-1">
        {songs.map((s) => (
          <li key={s.genius_url}>
            <a href={s.genius_url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline flex items-center gap-1">
              <ChevronRight size={12} />
              {s.artist} — {s.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SongInfo() {
  const [titleQ, setTitleQ] = useState('');
  const [artistQ, setArtistQ] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [info, setInfo] = useState<TrackInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!titleQ.trim()) return;
    setSearching(true);
    setResults([]);
    setInfo(null);
    setError(null);
    try {
      const data = await tracksApi.search(titleQ.trim(), artistQ.trim() || undefined);
      setResults(data);
    } catch {
      setError('Ошибка поиска. Проверьте соединение с сервером.');
    } finally {
      setSearching(false);
    }
  };

  const selectTrack = async (track: SpotifyTrack) => {
    setResults([]);
    setInfo(null);
    setError(null);
    setLoading(true);
    try {
      const data = await tracksApi.getInfo(track.id);
      setInfo(data);
    } catch {
      setError('Не удалось загрузить информацию о треке.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            Информация о песне
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Введите название — соберём данные из Spotify, Genius, Last.fm, Setlist.fm и YouTube.
          </p>
        </div>

        {/* Search form */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={titleQ}
              onChange={(e) => setTitleQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Название песни…"
              className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-900 placeholder-gray-400 text-base transition"
            />
          </div>
          <input
            type="text"
            value={artistQ}
            onChange={(e) => setArtistQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Исполнитель (необязательно)"
            className="sm:w-52 px-4 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-900 placeholder-gray-400 text-base transition"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !titleQ.trim()}
            className="px-6 py-4 bg-sky-500 text-white rounded-2xl font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {searching ? '…' : 'Найти'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Search results */}
        {results.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
            {results.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTrack(t)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-left group border-b border-gray-50 last:border-0"
              >
                {t.cover_url ? (
                  <img src={t.cover_url} alt={t.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Music size={16} className="text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm group-hover:text-sky-600 transition-colors truncate">{t.title}</p>
                  <p className="text-gray-500 text-xs truncate">{t.artist} · {t.album} · {t.release_date.slice(0, 4)}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{fmtMs(t.duration_ms)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-12 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Загружаем данные…
          </div>
        )}

        {/* Track info */}
        {info && (
          <div className="mt-6 space-y-5">
            {/* Spotify */}
            <Section title="Spotify">
              <div className="flex items-center gap-4">
                {info.spotify.cover_url && (
                  <img src={info.spotify.cover_url} alt={info.spotify.title} className="w-20 h-20 rounded-2xl object-cover shadow-md flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{info.spotify.title}</h2>
                  <p className="text-gray-600 font-medium truncate">{info.spotify.artist}</p>
                  <p className="text-gray-400 text-sm truncate">{info.spotify.album} · {info.spotify.release_date.slice(0, 4)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Row icon={<Clock size={15} />} label="Длительность" value={fmtMs(info.spotify.duration_ms)} />
                {info.spotify.popularity !== null && (
                  <Row icon={<Headphones size={15} />} label="Популярность" value={`${info.spotify.popularity}/100`} />
                )}
              </div>
              {info.spotify.preview_url && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Превью</p>
                  <audio controls src={info.spotify.preview_url} className="w-full h-10" />
                </div>
              )}
              <a href={info.spotify.spotify_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 text-sm font-medium transition-colors">
                <ExternalLink size={14} /> Открыть в Spotify
              </a>
            </Section>

            {/* Genius */}
            {info.genius && (
              <Section title="Genius">
                <div className="space-y-2">
                  <ArtistList artists={info.genius.writer_artists} label="Авторы" />
                  <ArtistList artists={info.genius.producer_artists} label="Продюсеры" />
                  <ArtistList artists={info.genius.featured_artists} label="Фиче-артисты" />
                  {info.genius.release_date && (
                    <Row icon={<Calendar size={15} />} label="Дата выхода" value={info.genius.release_date} />
                  )}
                  {info.genius.language && (
                    <Row icon={<Globe size={15} />} label="Язык" value={info.genius.language} />
                  )}
                  {info.genius.pageviews !== null && (
                    <Row icon={<Eye size={15} />} label="Просмотры" value={fmtNum(info.genius.pageviews)} />
                  )}
                </div>

                {info.genius.media.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Стриминги</p>
                    <div className="flex flex-wrap gap-2">
                      {info.genius.media.map((m) => (
                        <a key={m.url} href={m.url} target="_blank" rel="noreferrer"
                          className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-sky-50 hover:text-sky-600 transition-colors flex items-center gap-1">
                          <ExternalLink size={10} /> {m.type}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relations */}
                <div className="space-y-3 pt-1">
                  <RelatedList songs={info.genius.samples} label="Сэмплирует" />
                  <RelatedList songs={info.genius.sampled_in} label="Сэмплировали" />
                  <RelatedList songs={info.genius.cover_of} label="Кавер на" />
                  <RelatedList songs={info.genius.covered_by} label="Каверы" />
                  <RelatedList songs={info.genius.remix_of} label="Ремикс на" />
                  <RelatedList songs={info.genius.remixes} label="Ремиксы" />
                  <RelatedList songs={info.genius.interpolates} label="Интерполирует" />
                  <RelatedList songs={info.genius.interpolated_by} label="Интерполировали" />
                  <RelatedList songs={info.genius.live_version_of} label="Live-версия" />
                </div>

                <a href={info.genius.lyrics_url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 text-sm font-medium transition-colors">
                  <ExternalLink size={14} /> Текст на Genius
                </a>
              </Section>
            )}

            {/* Last.fm */}
            {info.lastfm && (
              <Section title="Last.fm">
                <div className="space-y-2">
                  <Row icon={<Users size={15} />} label="Слушателей" value={fmtNum(info.lastfm.listeners)} />
                  <Row icon={<Play size={15} />} label="Прослушиваний" value={fmtNum(info.lastfm.playcount)} />
                </div>
                {info.lastfm.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Теги</p>
                    <div className="flex flex-wrap gap-2">
                      {info.lastfm.tags.map((tag) => (
                        <a key={tag.url} href={tag.url} target="_blank" rel="noreferrer"
                          className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                          {tag.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {info.lastfm.similar.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Похожие треки</p>
                    <ul className="space-y-1">
                      {info.lastfm.similar.map((s) => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noreferrer"
                            className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                            <ChevronRight size={12} />{s.artist} — {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <a href={info.lastfm.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 text-sm font-medium transition-colors">
                  <ExternalLink size={14} /> Открыть на Last.fm
                </a>
              </Section>
            )}

            {/* Setlist.fm */}
            {info.setlistfm && (
              <Section title="Setlist.fm — живые выступления">
                <div className="space-y-2">
                  <Row icon={<Mic2 size={15} />} label="Исполнений" value={String(info.setlistfm.total_performances)} />
                  <Row icon={<AudioLines size={15} />} label="В encore" value={String(info.setlistfm.encore_count)} />
                </div>
                {info.setlistfm.first_performance && (
                  <div className="text-sm">
                    <p className="text-gray-500 mb-1 font-medium">Первое выступление</p>
                    <p className="text-gray-900">
                      {info.setlistfm.first_performance.date} · {info.setlistfm.first_performance.venue}, {info.setlistfm.first_performance.city}
                      {info.setlistfm.first_performance.tour && <span className="text-gray-500"> · {info.setlistfm.first_performance.tour}</span>}
                    </p>
                  </div>
                )}
                {info.setlistfm.last_performance && (
                  <div className="text-sm">
                    <p className="text-gray-500 mb-1 font-medium">Последнее выступление</p>
                    <p className="text-gray-900">
                      {info.setlistfm.last_performance.date} · {info.setlistfm.last_performance.venue}, {info.setlistfm.last_performance.city}
                      {info.setlistfm.last_performance.tour && <span className="text-gray-500"> · {info.setlistfm.last_performance.tour}</span>}
                    </p>
                  </div>
                )}
              </Section>
            )}

            {/* YouTube */}
            <Section title="YouTube">
              <div className="space-y-2">
                {info.youtube.view_count !== null && (
                  <Row icon={<Eye size={15} />} label="Просмотров" value={fmtNum(info.youtube.view_count)} />
                )}
                {info.youtube.like_count !== null && (
                  <Row icon={<ThumbsUp size={15} />} label="Лайков" value={fmtNum(info.youtube.like_count)} />
                )}
              </div>
              <a href={info.youtube.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 text-sm font-medium transition-colors">
                <Video size={14} /> {info.youtube.video_id ? 'Смотреть клип' : 'Найти на YouTube'}
              </a>
            </Section>

            {/* Yandex */}
            <Section title="Яндекс Музыка">
              <div className="space-y-2">
                {info.yandex.likes_count !== null && (
                  <Row icon={<ThumbsUp size={15} />} label="Лайков" value={fmtNum(info.yandex.likes_count)} />
                )}
                {info.yandex.chart && (
                  <Row
                    icon={<Radio size={15} />}
                    label="Чарт"
                    value={
                      <span className="flex items-center gap-1">
                        #{info.yandex.chart.position}
                        {info.yandex.chart.progress === 'up' && <span className="text-green-500">↑</span>}
                        {info.yandex.chart.progress === 'down' && <span className="text-red-500">↓</span>}
                        {info.yandex.chart.progress === 'same' && <span className="text-gray-400">→</span>}
                      </span>
                    }
                  />
                )}
              </div>
              <a
                href={info.yandex.url ?? info.yandex.search_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 text-sm font-medium transition-colors"
              >
                <Radio size={14} /> {info.yandex.url ? 'Открыть в Яндекс Музыке' : 'Найти в Яндекс Музыке'}
              </a>
            </Section>

            {/* Apple Music */}
            <Section title="Apple Music">
              {info.apple_music.chart && (
                <div className="space-y-2">
                  <Row
                    icon={<Music size={15} />}
                    label="Чарт RU"
                    value={`#${info.apple_music.chart.position}`}
                  />
                </div>
              )}
              <a
                href={info.apple_music.search_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 text-sm font-medium transition-colors"
              >
                <Headphones size={14} /> Найти в Apple Music
              </a>
            </Section>
          </div>
        )}

        {/* Empty state */}
        {!info && !loading && results.length === 0 && !error && (
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
