import { useState, useRef, useEffect } from 'react';
import { tracksApi, type SpotifyTrack, type TrackInfo } from '../lib/api';
import { CollapsibleList } from '../components/CollapsibleList';

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const GENIUS_COUNTRY: Record<string, { flag: string; ru: string }> = {
  // English names
  'USA': { flag: '🇺🇸', ru: 'США' },
  'Canada': { flag: '🇨🇦', ru: 'Канада' },
  'UK': { flag: '🇬🇧', ru: 'Великобритания' },
  'England': { flag: '🇬🇧', ru: 'Великобритания' },
  'Australia': { flag: '🇦🇺', ru: 'Австралия' },
  'France': { flag: '🇫🇷', ru: 'Франция' },
  'Germany': { flag: '🇩🇪', ru: 'Германия' },
  'Spain': { flag: '🇪🇸', ru: 'Испания' },
  'Italy': { flag: '🇮🇹', ru: 'Италия' },
  'Sweden': { flag: '🇸🇪', ru: 'Швеция' },
  'Norway': { flag: '🇳🇴', ru: 'Норвегия' },
  'Denmark': { flag: '🇩🇰', ru: 'Дания' },
  'Netherlands': { flag: '🇳🇱', ru: 'Нидерланды' },
  'Belgium': { flag: '🇧🇪', ru: 'Бельгия' },
  'Switzerland': { flag: '🇨🇭', ru: 'Швейцария' },
  'Austria': { flag: '🇦🇹', ru: 'Австрия' },
  'Finland': { flag: '🇫🇮', ru: 'Финляндия' },
  'Iceland': { flag: '🇮🇸', ru: 'Исландия' },
  'Ireland': { flag: '🇮🇪', ru: 'Ирландия' },
  'Poland': { flag: '🇵🇱', ru: 'Польша' },
  'Russia': { flag: '🇷🇺', ru: 'Россия' },
  'Ukraine': { flag: '🇺🇦', ru: 'Украина' },
  'Czech Republic': { flag: '🇨🇿', ru: 'Чехия' },
  'Hungary': { flag: '🇭🇺', ru: 'Венгрия' },
  'Romania': { flag: '🇷🇴', ru: 'Румыния' },
  'Greece': { flag: '🇬🇷', ru: 'Греция' },
  'Turkey': { flag: '🇹🇷', ru: 'Турция' },
  'Portugal': { flag: '🇵🇹', ru: 'Португалия' },
  'Japan': { flag: '🇯🇵', ru: 'Япония' },
  'South Korea': { flag: '🇰🇷', ru: 'Южная Корея' },
  'China': { flag: '🇨🇳', ru: 'Китай' },
  'India': { flag: '🇮🇳', ru: 'Индия' },
  'Israel': { flag: '🇮🇱', ru: 'Израиль' },
  'Egypt': { flag: '🇪🇬', ru: 'Египет' },
  'Nigeria': { flag: '🇳🇬', ru: 'Нигерия' },
  'Ghana': { flag: '🇬🇭', ru: 'Гана' },
  'South Africa': { flag: '🇿🇦', ru: 'ЮАР' },
  'Kenya': { flag: '🇰🇪', ru: 'Кения' },
  'Senegal': { flag: '🇸🇳', ru: 'Сенегал' },
  'Jamaica': { flag: '🇯🇲', ru: 'Ямайка' },
  'Trinidad & Tobago': { flag: '🇹🇹', ru: 'Тринидад и Тобаго' },
  'Puerto Rico': { flag: '🇵🇷', ru: 'Пуэрто-Рико' },
  'Cuba': { flag: '🇨🇺', ru: 'Куба' },
  'Haiti': { flag: '🇭🇹', ru: 'Гаити' },
  'Dominican Republic': { flag: '🇩🇴', ru: 'Доминиканская Республика' },
  'Panama': { flag: '🇵🇦', ru: 'Панама' },
  'Brazil': { flag: '🇧🇷', ru: 'Бразилия' },
  'Argentina': { flag: '🇦🇷', ru: 'Аргентина' },
  'Colombia': { flag: '🇨🇴', ru: 'Колумбия' },
  'Chile': { flag: '🇨🇱', ru: 'Чили' },
  'Peru': { flag: '🇵🇪', ru: 'Перу' },
  'Venezuela': { flag: '🇻🇪', ru: 'Венесуэла' },
  'Ecuador': { flag: '🇪🇨', ru: 'Эквадор' },
  'Mexico': { flag: '🇲🇽', ru: 'Мексика' },
  'Uruguay': { flag: '🇺🇾', ru: 'Уругвай' },
  'Paraguay': { flag: '🇵🇾', ru: 'Парагвай' },
  'Bolivia': { flag: '🇧🇴', ru: 'Боливия' },
  'Costa Rica': { flag: '🇨🇷', ru: 'Коста-Рика' },
  'Guatemala': { flag: '🇬🇹', ru: 'Гватемала' },
  'Honduras': { flag: '🇭🇳', ru: 'Гондурас' },
  'El Salvador': { flag: '🇸🇻', ru: 'Сальвадор' },
  'Nicaragua': { flag: '🇳🇮', ru: 'Никарагуа' },
  'New Zealand': { flag: '🇳🇿', ru: 'Новая Зеландия' },
  'Mongolia': { flag: '🇲🇳', ru: 'Монголия' },
  'Tunisian': { flag: '🇹🇳', ru: 'Тунис' },
  'Tunisia': { flag: '🇹🇳', ru: 'Тунис' },
  'Algerian': { flag: '🇩🇿', ru: 'Алжир' },
  'Algeria': { flag: '🇩🇿', ru: 'Алжир' },
  'Moroccan': { flag: '🇲🇦', ru: 'Марокко' },
  'Morocco': { flag: '🇲🇦', ru: 'Марокко' },
  'Ethiopian': { flag: '🇪🇹', ru: 'Эфиопия' },
  'Ethiopia': { flag: '🇪🇹', ru: 'Эфиопия' },
  'Kazakhstan': { flag: '🇰🇿', ru: 'Казахстан' },
  'Uzbekistan': { flag: '🇺🇿', ru: 'Узбекистан' },
  'Azerbaijan': { flag: '🇦🇿', ru: 'Азербайджан' },
  'Georgia': { flag: '🇬🇪', ru: 'Грузия' },
  'Armenia': { flag: '🇦🇲', ru: 'Армения' },
  'Iran': { flag: '🇮🇷', ru: 'Иран' },
  'Iraq': { flag: '🇮🇶', ru: 'Ирак' },
  'Saudi Arabia': { flag: '🇸🇦', ru: 'Саудовская Аравия' },
  'Lebanon': { flag: '🇱🇧', ru: 'Ливан' },
  'Pakistan': { flag: '🇵🇰', ru: 'Пакистан' },
  'Bangladesh': { flag: '🇧🇩', ru: 'Бангладеш' },
  'Indonesia': { flag: '🇮🇩', ru: 'Индонезия' },
  'Philippines': { flag: '🇵🇭', ru: 'Филиппины' },
  'Vietnam': { flag: '🇻🇳', ru: 'Вьетнам' },
  'Thailand': { flag: '🇹🇭', ru: 'Таиланд' },
  'Malaysia': { flag: '🇲🇾', ru: 'Малайзия' },
  'Singapore': { flag: '🇸🇬', ru: 'Сингапур' },
  'Taiwan': { flag: '🇹🇼', ru: 'Тайвань' },
  // Native language names (Genius sometimes uses them)
  'Deutschland': { flag: '🇩🇪', ru: 'Германия' },
  'België/Belgique': { flag: '🇧🇪', ru: 'Бельгия' },
  'Österreich': { flag: '🇦🇹', ru: 'Австрия' },
  'Schweiz/Suisse': { flag: '🇨🇭', ru: 'Швейцария' },
  'España': { flag: '🇪🇸', ru: 'Испания' },
  'Italia': { flag: '🇮🇹', ru: 'Италия' },
  'Brasil': { flag: '🇧🇷', ru: 'Бразилия' },
  'México': { flag: '🇲🇽', ru: 'Мексика' },
  'Sverige': { flag: '🇸🇪', ru: 'Швеция' },
  'Norge': { flag: '🇳🇴', ru: 'Норвегия' },
  'Danmark': { flag: '🇩🇰', ru: 'Дания' },
  'Nederland': { flag: '🇳🇱', ru: 'Нидерланды' },
  'Suomi': { flag: '🇫🇮', ru: 'Финляндия' },
  'Suomi/Finland': { flag: '🇫🇮', ru: 'Финляндия' },
  'Ísland': { flag: '🇮🇸', ru: 'Исландия' },
  'Polska': { flag: '🇵🇱', ru: 'Польша' },
  'Россия': { flag: '🇷🇺', ru: 'Россия' },
  'Україна': { flag: '🇺🇦', ru: 'Украина' },
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const GENIUS_COUNTRY_NORM = Object.fromEntries(
  Object.entries(GENIUS_COUNTRY).map(([k, v]) => [norm(k), v])
);
const lookupCountry = (s: string) => GENIUS_COUNTRY[s] ?? GENIUS_COUNTRY_NORM[norm(s)];

function getCountriesFromTags(tags: string[]): { flag: string; ru: string }[] {
  const seen = new Set<string>();
  const result: { flag: string; ru: string }[] = [];
  for (const tag of tags) {
    const entry = lookupCountry(tag) ?? (() => {
      // "South Korea (대한민국)" → try inside parens, then before parens
      const inParens = tag.match(/\(([^)]+)\)$/);
      if (inParens) { const e = lookupCountry(inParens[1]); if (e) return e; }
      const beforeParens = tag.replace(/\s*\([^)]*\)$/, '').trim();
      const e2 = lookupCountry(beforeParens); if (e2) return e2;
      // "Tunisian - تونسي" → try before " - "
      return lookupCountry(tag.split(' - ')[0].trim());
    })();
    if (entry && !seen.has(entry.ru)) {
      seen.add(entry.ru);
      result.push(entry);
    }
  }
  return result;
}

const MONO: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' };
const SANS: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif' };

const LBL = 'text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]';
const VAL = 'text-[13px] font-semibold text-white';

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 px-4 py-[11px] border-b border-white/[0.08] last:border-0 bg-white/[0.02]">
      <span className={`${LBL} shrink-0 pt-[1px]`} style={SANS}>{label}</span>
      <span className={`${VAL} text-right`} style={SANS}>{value}</span>
    </div>
  );
}

function MetaCompact({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="flex border-b border-white/[0.08] last:border-0 bg-white/[0.02]">
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex-1 flex flex-col items-center gap-0.5 px-4 py-[10px]${i > 0 ? ' border-l border-white/[0.08]' : ''}`}
        >
          <span className={LBL} style={SANS}>{item.label}</span>
          <span className={`${VAL} text-[13px]`} style={SANS}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function GeniusLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[12px] font-semibold transition-opacity hover:opacity-80 flex items-center gap-1"
      style={{ color: '#2DD4BF', ...SANS }}
    >
      ▸ {children}
    </a>
  );
}

function StripCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center flex-wrap gap-3 px-5 py-3.5 rounded-[14px] border border-white/[0.1]"
      style={{ background: 'rgba(24,24,28,.78)', backdropFilter: 'saturate(180%) blur(24px)' }}
    >
      {children}
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] font-bold transition-opacity hover:opacity-80"
      style={{ color: '#2DD4BF', ...SANS }}
    >
      {children}
    </a>
  );
}

function ServiceLogo({ icon, name, link, linkLabel }: { icon: React.ReactNode; name: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex-shrink-0 w-[140px] flex items-center gap-2.5 border-r border-white/[0.08] pr-4 mr-2">
      {icon}
      <div>
        <div className="text-[12px] font-bold text-white" style={SANS}>{name}</div>
        {link && (
          <ExternalLink href={link}>{linkLabel ?? '→ Открыть'}</ExternalLink>
        )}
      </div>
    </div>
  );
}

function StatCol({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-4 ${last ? '' : 'border-r border-white/[0.08]'}`}>
      <div className={LBL} style={SANS}>{label}</div>
      <div className={`${VAL} mt-0.5`} style={SANS}>{value}</div>
    </div>
  );
}

const COUNTRY_FLAG: Record<string, string> = {
  ru: '🇷🇺', us: '🇺🇸', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷',
  au: '🇦🇺', mx: '🇲🇽', se: '🇸🇪', jp: '🇯🇵', kr: '🇰🇷',
};

export default function SongInfo() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [info, setInfo] = useState<TrackInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [setlistfm, setSetlistfm] = useState<import('../lib/api').SetlistStats | null>(null);
  const [setlistLoading, setSetlistLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const togglePreview = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setPreviewProgress((audio.currentTime / audio.duration) * 100);
    setPreviewTime(audio.currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setPreviewProgress(0);
    setPreviewTime(0);
  };

  const fmtSec = (s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}`;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setInfo(null);
    setError(null);
    try {
      const data = await tracksApi.search(query.trim());
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
    setSetlistfm(null);
    setSetlistLoading(true);
    setError(null);
    setLoading(true);
    setIsPlaying(false);
    setPreviewProgress(0);
    setPreviewTime(0);
    audioRef.current?.pause();

    tracksApi.getSetlistfm(track.id)
      .then(data => setSetlistfm(data))
      .catch(() => {})
      .finally(() => setSetlistLoading(false));

    try {
      const data = await tracksApi.getInfo(track.id);
      setInfo(data);
    } catch {
      setError('Не удалось загрузить информацию о треке.');
    } finally {
      setLoading(false);
    }
  };

  const genius = info?.genius;

  return (
    <main className="px-4 sm:px-7 py-7 pb-16">

      {/* Search */}
      <div className="flex gap-2.5 items-center mb-7">
        <div className="relative flex-1">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="11" cy="11" r="7" stroke="#8a8a8a" strokeWidth="2" />
            <path d="M21 21l-4-4" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Исполнитель и название песни…"
            className="w-full pl-10 pr-9 py-3.5 rounded-[14px] border border-white/[0.1] bg-white/[0.07] text-white placeholder-[#8a8a8a] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF] focus:border-[#2DD4BF] text-[14px] font-medium transition"
            style={SANS}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/[0.12] hover:bg-white/[0.2] transition-colors"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1l6 6M7 1L1 7" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-5 h-12 rounded-full text-[#06231f] font-extrabold text-[13px] uppercase tracking-[0.08em] disabled:opacity-40 transition-opacity flex-shrink-0"
          style={{ background: '#2DD4BF', ...SANS }}
        >
          {searching ? '…' : 'Найти'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 p-4 rounded-[14px] border border-red-500/30 bg-red-500/10 text-red-400 text-sm" style={SANS}>
          {error}
        </div>
      )}

      {/* Search results dropdown */}
      {results.length > 0 && (
        <div className="mb-5 rounded-[16px] border border-white/[0.1] overflow-hidden" style={{ background: 'rgba(24,24,28,.95)' }}>
          {results.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTrack(t)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.05] transition-colors text-left group"
            >
              {t.cover_url ? (
                <img src={t.cover_url} alt={t.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18V6l10-2v10" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="6.5" cy="18" r="2.6" fill="#8a8a8a" /><circle cx="16.5" cy="14" r="2.6" fill="#8a8a8a" /></svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white text-sm truncate" style={SANS}>{t.title}</p>
                <p className="text-[#8a8a8a] text-xs truncate" style={SANS}>{t.artist} · {t.album} · {t.release_date.slice(0, 4)}</p>
              </div>
              <span className="text-xs text-[#8a8a8a] flex-shrink-0" style={MONO}>{fmtMs(t.duration_ms)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-16 flex flex-col items-center gap-4 text-[#8a8a8a]">
          <div className="animate-spin w-14 h-14" style={{ animationDuration: '1.8s' }}>
            <svg viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="28" fill="#1a1a1a" />
              <circle cx="28" cy="28" r="24" stroke="#2a2a2a" strokeWidth="0.8" fill="none" />
              <circle cx="28" cy="28" r="20" stroke="#2a2a2a" strokeWidth="0.8" fill="none" />
              <circle cx="28" cy="28" r="16" stroke="#2a2a2a" strokeWidth="0.8" fill="none" />
              <circle cx="28" cy="28" r="12" stroke="#2a2a2a" strokeWidth="0.8" fill="none" />
              <circle cx="28" cy="28" r="9" fill="#2DD4BF" />
              <circle cx="28" cy="28" r="5" fill="#b2f5ef" />
              <circle cx="28" cy="28" r="2" fill="#1a1a1a" />
            </svg>
          </div>
          <span className="text-sm font-medium" style={SANS}>Загружаем данные…</span>
        </div>
      )}

      {/* Track info */}
      {info && (
        <div className="space-y-2.5">

          {/* TOP ROW: cover+player | genius */}
          <div className="flex flex-col md:flex-row gap-3.5 items-stretch">

            {/* LEFT: cover + name card */}
            <div className="flex flex-col gap-3.5 md:w-[280px] md:flex-shrink-0">

              {/* Cover */}
              <div className="relative w-full md:w-[280px] aspect-square md:h-[280px] rounded-[20px] overflow-hidden flex-shrink-0"
                style={{ boxShadow: '0 16px 48px rgba(0,0,0,.6)' }}>
                {info.spotify.cover_url ? (
                  <img src={info.spotify.cover_url} alt={info.spotify.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: 'linear-gradient(140deg,#7c5cff,#c44ec7,#e8445a)' }} />
                )}
              </div>

              {/* Name + preview player */}
              <div
                className="rounded-[18px] p-4 border border-white/[0.1]"
                style={{ background: 'rgba(24,24,28,.78)', backdropFilter: 'saturate(180%) blur(24px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07),0 12px 40px rgba(0,0,0,.55)' }}
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <div className="font-extrabold text-[20px] text-white leading-tight" style={SANS}>
                    {info.spotify.title}
                  </div>
                  <span className="text-[12px] text-[#8a8a8a] font-semibold flex-shrink-0" style={MONO}>
                    {fmtMs(info.spotify.duration_ms)}
                  </span>
                </div>
                <div className="text-[13px] text-[#8a8a8a] font-medium mb-4" style={SANS}>
                  {info.spotify.artist} · {info.spotify.album} · {info.spotify.release_date.slice(0, 4)}
                </div>

                {info.spotify.preview_url ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] border border-white/[0.1] bg-white/[0.05]">
                    <audio
                      ref={audioRef}
                      src={info.spotify.preview_url}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleEnded}
                      preload="none"
                    />
                    <button
                      onClick={togglePreview}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80"
                      style={{ background: '#2DD4BF', boxShadow: '0 0 12px rgba(45,212,191,.35)' }}
                    >
                      {isPlaying ? (
                        <svg width="11" height="11" viewBox="0 0 10 10"><rect x="1" y="0" width="3" height="10" fill="#06231f" /><rect x="6" y="0" width="3" height="10" fill="#06231f" /></svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 10 10"><path d="M1 0l8 5-8 5z" fill="#06231f" /></svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="h-[3px] rounded-full bg-white/[0.12]">
                        <div className="h-full rounded-full transition-all" style={{ background: '#2DD4BF', width: `${previewProgress}%` }} />
                      </div>
                    </div>
                    <span className="text-[11px] text-[#8a8a8a]" style={MONO}>
                      {fmtSec(previewTime)} / 0:30
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-[14px] border border-white/[0.08] bg-white/[0.03]">
                    <span className="text-[12px] text-[#8a8a8a]" style={SANS}>Превью недоступно</span>
                  </div>
                )}

                {info.spotify.popularity !== null && (
                  <div className="mt-3">
                    <span className="text-[11px] text-[#8a8a8a] font-medium" style={SANS}>
                      Популярность: <span className="text-white font-bold">{info.spotify.popularity}/100</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Genius card */}
            {genius && (
              <div
                className="flex-1 rounded-[18px] p-5 border border-white/[0.1] flex flex-col gap-4 min-w-0"
                style={{ background: 'rgba(24,24,28,.78)', backdropFilter: 'saturate(180%) blur(24px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07),0 12px 40px rgba(0,0,0,.55)' }}
              >
                {/* Meta rows */}
                <div className="rounded-[12px] overflow-hidden border border-white/[0.08]">
                  {genius.producer_artists.length > 0 && (
                    <MetaRow label="Продюсер" value={genius.producer_artists.map(a => a.name).join(', ')} />
                  )}
                  {genius.writer_artists.length > 0 && (
                    <MetaRow label="Авторы" value={genius.writer_artists.map(a => a.name).join(', ')} />
                  )}
                  {genius.featured_artists.length > 0 && (
                    <MetaRow label="Featuring" value={genius.featured_artists.map(a => a.name).join(', ')} />
                  )}
                  {(() => {
                    const compact: { label: string; value: React.ReactNode }[] = [];
                    if (genius.release_date || genius.release_year) {
                      const fmtDate = (d: string) => {
                        const [y, m, day] = d.split('-');
                        if (!m) return d;
                        return day ? `${day}.${m}.${y}` : `${m}.${y}`;
                      };
                      compact.push({ label: 'Дата выхода', value: genius.release_date ? fmtDate(genius.release_date) : String(genius.release_year) });
                    }
                    const countries = getCountriesFromTags(genius.tags);
                    if (countries.length) compact.push({ label: 'Страна', value: (
                      <span className="flex flex-wrap justify-center gap-x-1.5">
                        {countries.map((c, i) => (
                          <span key={i} style={{ whiteSpace: 'nowrap' }}>
                            {i > 0 && <span className="text-white/30 mx-0.5">·</span>}
                            <span style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>{c.flag}</span> {c.ru}
                          </span>
                        ))}
                      </span>
                    ) });
                    compact.push({ label: 'Текст песни', value: <ExternalLink href={genius.lyrics_url}>→ Открыть</ExternalLink> });
                    if (genius.pageviews !== null)
                      compact.push({ label: 'Просмотры текста', value: fmtNum(genius.pageviews) });
                    return compact.length > 0 ? <MetaCompact items={compact} /> : null;
                  })()}
                  {genius.tags.length > 0 && (
                    <div className="px-4 py-3 flex flex-wrap gap-1.5 border-t border-white/[0.08]">
                      {genius.tags.map((tag) => (
                        <span key={tag}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(245,158,66,.14)', color: '#f0a85a', ...SANS }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relations */}
                <div className="flex flex-col gap-3 flex-1">
                  {[
                    { items: genius.samples, label: 'Сэмплирует' },
                    { items: genius.sampled_in, label: 'Сэмплировали' },
                    { items: genius.cover_of, label: 'Кавер на' },
                    { items: genius.covered_by, label: 'Каверы' },
                    { items: genius.remix_of, label: 'Ремикс на' },
                    { items: genius.remixes, label: 'Ремиксы' },
                    { items: genius.interpolates, label: 'Интерполирует' },
                    { items: genius.interpolated_by, label: 'Интерполировали' },
                    { items: genius.live_version_of, label: 'Live-версия' },
                  ].filter(({ items }) => items.length > 0).map(({ items, label }) => (
                    <div key={label}>
                      <div className={`${LBL} mb-1.5`} style={SANS}>
                        {label}{items.length > 1 ? ` (${items.length})` : ''}
                      </div>
                      <CollapsibleList
                        items={items}
                        limit={3}
                        renderItem={(s) => (
                          <GeniusLink key={s.genius_url} href={s.genius_url}>
                            {s.artist} — {s.title}
                          </GeniusLink>
                        )}
                      />
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* SERVICE STRIPS */}
          <div className="flex flex-col gap-2 mt-1">

            {/* Last.fm */}
            {info.lastfm && (
              <StripCard>
                <ServiceLogo
                  name="Last.fm"
                  link={info.lastfm.url}
                  linkLabel="→ Открыть"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#D51007">
                      <path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z" />
                    </svg>
                  }
                />
                <div className="flex flex-wrap items-center gap-0">
                  <StatCol label="Слушателей" value={fmtNum(info.lastfm.listeners)} />
                  <StatCol label="Прослушиваний" value={fmtNum(info.lastfm.playcount)} last={info.lastfm.tags.length === 0} />
                  {info.lastfm.tags.length > 0 && (
                    <div className="px-4 flex flex-wrap gap-1.5">
                      {info.lastfm.tags.slice(0, 4).map((tag) => (
                        <a key={tag.url} href={tag.url} target="_blank" rel="noreferrer"
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                          style={{ background: 'rgba(245,158,66,.14)', color: '#f0a85a', ...SANS }}>
                          {tag.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </StripCard>
            )}

            {/* YouTube */}
            <StripCard>
              <ServiceLogo
                name="YouTube"
                link={info.youtube.url || info.youtube.search_url}
                linkLabel={info.youtube.video_id ? '→ Смотреть' : '→ Найти'}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF0000">
                    <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                  </svg>
                }
              />
              <div className="flex flex-wrap items-center gap-0">
                {info.youtube.view_count !== null && (
                  <StatCol label="Просмотров" value={fmtNum(info.youtube.view_count)} last={info.youtube.like_count === null} />
                )}
                {info.youtube.like_count !== null && (
                  <StatCol label="Лайков" value={fmtNum(info.youtube.like_count)} last />
                )}
                {info.youtube.view_count === null && info.youtube.like_count === null && (
                  <span className="px-4 text-[#8a8a8a] text-[13px]" style={SANS}>Видео не найдено</span>
                )}
              </div>
            </StripCard>

            {/* Setlist.fm */}
            {(setlistLoading || setlistfm) && (
              <StripCard>
                <ServiceLogo
                  name="Setlist.fm"
                  link={setlistfm?.url}
                  linkLabel="→ Открыть"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF6C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="rgba(239,108,0,0.15)" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                      <line x1="9" y1="22" x2="15" y2="22" />
                    </svg>
                  }
                />
                {setlistLoading ? (
                  <span className="text-[#8a8a8a] text-[13px]" style={SANS}>Загружаем…</span>
                ) : setlistfm ? (
                  <div className="flex flex-wrap items-center gap-0">
                    <StatCol label="Исполнений" value={String(setlistfm.total_performances)} />
                    {setlistfm.first_performance && (
                      <div className="px-4 border-r border-white/[0.08]">
                        <div className={`${LBL} mb-0.5`} style={SANS}>Первое</div>
                        <div className="text-[13px] font-semibold text-white" style={SANS}>
                          {setlistfm.first_performance.date.split('-').join('.')} · {setlistfm.first_performance.city}
                        </div>
                      </div>
                    )}
                    {setlistfm.last_performance && (
                      <div className="px-4">
                        <div className={`${LBL} mb-0.5`} style={SANS}>Последнее</div>
                        <div className="text-[13px] font-semibold text-white" style={SANS}>
                          {setlistfm.last_performance.date.split('-').join('.')} · {setlistfm.last_performance.city}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </StripCard>
            )}

            {/* Compact row: Yandex + Apple + Spotify */}
            <StripCard>
              {/* Yandex */}
              <a
                href={info.yandex.url ?? info.yandex.search_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center gap-2.5 border-r border-white/[0.08] pr-4 hover:opacity-80 transition-opacity min-w-[130px]"
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path d="M24 48C37.2548 48 48 37.2548 48 24C48 10.7452 37.2548 0 24 0C10.7452 0 0 10.7452 0 24C0 37.2548 10.7452 48 24 48Z" fill="#FFBC0D" />
                  <path d="M42.3995 19.3967L42.2975 18.6445L36.1353 17.2059L39.3184 12.4823L38.9423 11.9702L33.9785 14.3989L34.5267 7.7926L33.9785 7.52062L30.8974 12.8244L27.2702 4.84961H26.586L27.4742 12.6544L18.403 5.43183L17.6167 5.63795L24.5992 14.3989L10.7363 9.77939L10.0861 10.4976L22.4764 17.514L5.4304 18.9526L5.25829 19.9789L22.9906 21.8956L8.16941 34.0139L8.85363 34.9383L26.4139 25.3528L22.9566 42.1608H24.017L30.7954 26.3473L34.9028 38.7036L35.6211 38.1554L34.0805 25.7651L40.3447 32.8495L40.723 32.1313L36.0673 23.3682L42.6736 25.6971L42.7416 24.9767L37.2317 20.5612L42.3995 19.3967Z" fill="#1A1A1A" />
                </svg>
                <div>
                  <div className="text-[12px] font-bold text-white" style={SANS}>Яндекс Музыка</div>
                  <span className="text-[11px] font-bold" style={{ color: '#2DD4BF', ...SANS }}>
                    {info.yandex.url ? '→ Открыть' : '→ Найти'}
                  </span>
                </div>
              </a>

              {/* Apple Music */}
              {(() => {
                const isItunes = info.spotify.id.startsWith('itunes:');
                const appleUrl = isItunes ? info.spotify.spotify_url : info.apple_music.search_url;
                const appleLabel = isItunes
                  ? '→ Открыть'
                  : info.apple_music.charts.length > 0
                    ? `→ Чарт: ${info.apple_music.charts.sort((a,b)=>a.position-b.position).slice(0,2).map(c=>`${COUNTRY_FLAG[c.country]??c.country.toUpperCase()} #${c.position}`).join(', ')}`
                    : '→ Найти';
                return (
                  <a
                    href={appleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center gap-2.5 border-r border-white/[0.08] pr-4 hover:opacity-80 transition-opacity min-w-[130px]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    <div>
                      <div className="text-[12px] font-bold text-white" style={SANS}>Apple Music</div>
                      <span className="text-[11px] font-bold" style={{ color: '#2DD4BF', ...SANS }}>{appleLabel}</span>
                    </div>
                  </a>
                );
              })()}

              {/* Spotify */}
              {(() => {
                const isItunes = info.spotify.id.startsWith('itunes:');
                const spotifyUrl = isItunes
                  ? `https://open.spotify.com/search/${encodeURIComponent(`${info.spotify.title} ${info.spotify.artist}`)}`
                  : info.spotify.spotify_url;
                return (
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center gap-2.5 hover:opacity-80 transition-opacity min-w-[130px]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DB954">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    <div>
                      <div className="text-[12px] font-bold text-white" style={SANS}>Spotify</div>
                      <span className="text-[11px] font-bold" style={{ color: '#2DD4BF', ...SANS }}>
                        {isItunes ? '→ Найти' : '→ Открыть'}
                      </span>
                    </div>
                  </a>
                );
              })()}
            </StripCard>

          </div>
        </div>
      )}

      {/* Empty state */}
      {!info && !loading && results.length === 0 && !error && (
        <div className="mt-20 flex flex-col items-center gap-3 text-[#8a8a8a]">
          <div className="w-14 h-14 rounded-[16px] flex items-center justify-center border border-white/[0.08]" style={{ background: 'rgba(45,212,191,.08)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V6l10-2v10" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6.5" cy="18" r="2.6" fill="#2DD4BF" />
              <circle cx="16.5" cy="14" r="2.6" fill="#2DD4BF" />
            </svg>
          </div>
          <p className="text-[14px] font-medium" style={SANS}>Введите название, чтобы начать поиск</p>
        </div>
      )}
    </main>
  );
}
