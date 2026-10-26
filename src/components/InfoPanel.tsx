import { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { infoApi, type ArtistInfo, type AlbumInfo, type Localized, type WikiPage, type BandMember } from '../lib/api';
import { t, lang } from '../i18n';

const SANS: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif' };
const MONO: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' };
const LBL = 'text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]';
const CARD = 'rounded-[16px] border border-white/[0.1] overflow-hidden';
const CARD_BG: React.CSSProperties = { background: 'rgba(24,24,28,.95)' };

// ── Helpers ──────────────────────────────────────────────────────────────────

const loc = (l: Localized | null | undefined) =>
  (lang === 'ru' ? l?.ru ?? l?.en : l?.en ?? l?.ru) ?? null;

// Текст — на языке интерфейса; в английском русскую статью не подставляем
const pageFor = (w: { ru: WikiPage | null; en: WikiPage | null }) =>
  lang === 'ru' ? w.ru ?? w.en : w.en;

const year = (d: string | null) => d?.slice(0, 4) ?? null;

function fmtDate(d: string | null) {
  if (!d) return null;
  if (d.length < 10) return d.slice(0, 4);
  return new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).replace(/\s*г\.$/, '');
}

const ROLES_RU: Record<string, string> = {
  'lead vocals': 'вокал',
  'vocals': 'вокал',
  'other vocals': 'вокал',
  'background vocals': 'бэк-вокал',
  'guitar': 'гитара',
  'electric guitar': 'гитара',
  'acoustic guitar': 'гитара',
  'bass guitar': 'бас',
  'bass': 'бас',
  'drums': 'ударные',
  'percussion': 'перкуссия',
  'keyboard': 'клавишные',
  'piano': 'фортепиано',
  'synthesizer': 'синтезатор',
  'saxophone': 'саксофон',
  'violin': 'скрипка',
  'accordion': 'аккордеон',
};

function memberRoles(m: BandMember) {
  const roles = lang === 'ru' ? m.roles.map(r => ROLES_RU[r] ?? r) : m.roles;
  return [...new Set(roles)].slice(0, 3).join(', ');
}

function memberYears(m: BandMember, dissolved: string | null) {
  return m.periods
    .map(p => {
      const b = year(p.begin);
      const e = year(p.end);
      if (!b) return null;
      if (!e) return dissolved ? b : `${b}–${t.info_present}`;
      return b === e ? b : `${b}–${e}`;
    })
    .filter(Boolean)
    .join(', ');
}

// Основные участники — те, кто дольше всех играл в группе
function tenure(m: BandMember, dissolved: string | null) {
  const now = Number(year(dissolved)) || new Date().getFullYear();
  return m.periods.reduce((sum, p) => {
    const b = Number(year(p.begin));
    return b ? sum + (Number(year(p.end)) || now) - b : sum;
  }, 0);
}

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = () => setMatch(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [query]);
  return match;
}

// Сервер не ждёт MusicBrainz дольше 2.5 с; опоздавшие данные он дописывает в кэш
const PENDING_RETRY_MS = 4000;

// Загрузка справки; null — не найдено или ошибка, панель тогда не показываем
function useInfo<T extends { pending: boolean }>(
  load: (fresh: boolean) => Promise<T | null>,
  peek: () => T | null | undefined,
  key: string,
) {
  const [data, setData] = useState<T | null>(() => peek() ?? null);
  const [loading, setLoading] = useState(() => peek() === undefined);
  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const ready = peek();
    setData(ready ?? null);
    setLoading(ready === undefined);
    load(false)
      .then(d => {
        if (cancelled) return;
        setData(d);
        // Один повтор: к этому времени сервер обычно уже дописал состав / оценку слушателей
        if (d?.pending) {
          retry = setTimeout(() => {
            load(true).then(fresh => { if (!cancelled && fresh) setData(fresh); }).catch(() => {});
          }, PENDING_RETRY_MS);
        }
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(retry); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, loading };
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function InfoLinks({ wikipedia, rym }: { wikipedia: { ru: WikiPage | null; en: WikiPage | null }; rym: string | null }) {
  // EN — в обоих языках интерфейса, RU — только в русском
  const links = [
    lang === 'ru' && wikipedia.ru ? { href: wikipedia.ru.url, label: t.info_wiki_ru } : null,
    wikipedia.en ? { href: wikipedia.en.url, label: t.info_wiki_en } : null,
    rym ? { href: rym, label: 'RYM' } : null,
  ].filter((l): l is { href: string; label: string } => !!l);

  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(l => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.12] text-[11px] font-semibold hover:bg-white/[0.08] transition-colors"
          style={{ color: '#2DD4BF', ...SANS }}
        >
          {l.label}
          <ExternalLink size={11} />
        </a>
      ))}
    </div>
  );
}

function Extract({ page }: { page: WikiPage | null }) {
  if (!page?.extract) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[13px] leading-relaxed text-white/85" style={SANS}>{page.extract}</p>
      <span className="text-[10px] text-[#8a8a8a]" style={SANS}>{t.info_source}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className={LBL} style={SANS}>{label}</span>
      <span className="text-[13px] font-semibold text-white" style={SANS}>{value}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className={`${CARD} px-4 py-3.5`} style={CARD_BG}>
      <div className="h-3 w-2/3 rounded bg-white/[0.08] animate-pulse" />
    </div>
  );
}

function ToggleHeader({ summary, open, onToggle }: { summary: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
    >
      <span className="min-w-0 flex-1 text-[13px] text-white/85 line-clamp-2 first-letter:uppercase" style={SANS}>{summary}</span>
      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#8a8a8a] flex-shrink-0" style={SANS}>
        {open ? t.info_less : t.info_more}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </span>
    </button>
  );
}

// ── Artist ───────────────────────────────────────────────────────────────────

const MEMBERS_LIMIT = 4;

function Members({ members, dissolved }: { members: BandMember[]; dissolved: string | null }) {
  const [all, setAll] = useState(false);
  if (!members.length) return null;

  const sorted = [...members].sort((a, b) => tenure(b, dissolved) - tenure(a, dissolved));
  const visible = all ? sorted : sorted.slice(0, MEMBERS_LIMIT);
  const hidden = sorted.length - MEMBERS_LIMIT;

  return (
    <div className="flex flex-col gap-2">
      <span className={LBL} style={SANS}>{t.info_members}</span>
      <div className="flex flex-col gap-1.5">
        {visible.map(m => (
          <div key={m.name} className="flex items-baseline gap-2 text-[13px]" style={SANS}>
            <span className="font-semibold text-white">{m.name}</span>
            <span className="text-[11px] text-[#8a8a8a]" style={MONO}>{memberYears(m, dissolved)}</span>
            {m.roles.length > 0 && <span className="text-[12px] text-[#8a8a8a] truncate">{memberRoles(m)}</span>}
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <button
          onClick={() => setAll(!all)}
          className="self-start text-[11px] font-semibold text-[#8a8a8a] hover:text-white transition-colors"
          style={SANS}
        >
          {all ? `↑ ${t.info_less}` : `+ ${t.info_show_more} ${hidden}`}
        </button>
      )}
    </div>
  );
}

export function ArtistInfoPanel({ artistId, artistName }: { artistId: string; artistName: string }) {
  const { data, loading } = useInfo<ArtistInfo>(
    fresh => infoApi.getArtist(artistId, artistName, fresh),
    () => infoApi.peekArtist(artistId, artistName),
    artistId,
  );
  const [open, setOpen] = useState(false);

  if (loading) return <div className="mb-4"><Skeleton /></div>;
  if (!data) return null;

  const page = pageFor(data.wikipedia);
  const founded = year(data.founded);
  const span = founded && data.dissolved ? `${founded}–${year(data.dissolved)}` : founded;
  const genres = data.genres.map(loc).filter(Boolean).join(', ');
  // Описание из Википедии («американская рок-группа») дублирует страну и жанры — только как запасной вариант
  const summary = [span, loc(data.country), genres].filter(Boolean).join(' · ') || page?.description || '';

  if (!summary) return null;

  return (
    <div className={`${CARD} mb-4`} style={CARD_BG}>
      <ToggleHeader summary={summary} open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="flex flex-col gap-4 px-4 pb-4 pt-1 border-t border-white/[0.06]">
          <div className="pt-3"><Extract page={page} /></div>
          <Members members={data.members} dissolved={data.dissolved} />
          <InfoLinks wikipedia={data.wikipedia} rym={data.rym_url} />
        </div>
      )}
    </div>
  );
}

// ── Album ────────────────────────────────────────────────────────────────────

const RATINGS_LIMIT = 6;

function CriticRatings({ ratings }: { ratings: AlbumInfo['critic_ratings'] }) {
  const [all, setAll] = useState(false);
  if (!ratings.length) return null;
  const visible = all ? ratings : ratings.slice(0, RATINGS_LIMIT);
  const hidden = ratings.length - RATINGS_LIMIT;

  return (
    <div className="flex flex-col gap-2">
      <span className={LBL} style={SANS}>{t.info_critics}</span>
      <div className="flex flex-col">
        {visible.map(r => (
          <div key={r.source} className="flex items-baseline justify-between gap-3 py-1 border-b border-white/[0.05] last:border-0">
            <span className="text-[12px] text-white/85 truncate" style={SANS}>{r.source}</span>
            <span className="text-[12px] font-semibold text-white flex-shrink-0" style={MONO}>{r.score}</span>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <button
          onClick={() => setAll(!all)}
          className="self-start text-[11px] font-semibold text-[#8a8a8a] hover:text-white transition-colors"
          style={SANS}
        >
          {all ? `↑ ${t.info_less}` : `+ ${t.info_show_more} ${hidden}`}
        </button>
      )}
    </div>
  );
}

function AlbumBody({ data }: { data: AlbumInfo }) {
  const page = pageFor(data.wikipedia);
  const join = (ls: Localized[]) => ls.map(loc).filter(Boolean).join(', ') || null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact label={t.label_release_date} value={fmtDate(data.released)} />
        <Fact label={t.info_label} value={join(data.labels)} />
        <Fact label={t.label_producer} value={join(data.producers)} />
        <Fact label={t.info_genres} value={join(data.genres)} />
      </div>
      <Extract page={page} />
      <CriticRatings ratings={data.critic_ratings} />
      {data.community_rating && (
        <div className="flex flex-col gap-0.5">
          <span className={LBL} style={SANS}>{t.info_community}</span>
          <span className="text-[13px] font-semibold text-white" style={MONO}>
            {data.community_rating.value.toFixed(2)}/5
            <span className="text-[11px] font-normal text-[#8a8a8a]"> · {data.community_rating.votes} {t.info_votes}</span>
          </span>
        </div>
      )}
      <InfoLinks wikipedia={data.wikipedia} rym={data.rym_url} />
    </div>
  );
}

// На десктопе — колонка справа от треклиста, на мобильном — сворачиваемый блок над ним
export function AlbumInfoPanel({ albumId, title, artistName }: { albumId: string; title: string; artistName?: string }) {
  const { data, loading } = useInfo<AlbumInfo>(
    fresh => infoApi.getAlbum(albumId, title, artistName, fresh),
    () => infoApi.peekAlbum(albumId, title, artistName),
    albumId,
  );
  const wide = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);

  if (loading) return <Skeleton />;
  if (!data) return null;

  if (wide) {
    return (
      <div className={`${CARD} p-4 md:sticky md:top-4`} style={CARD_BG}>
        <AlbumBody data={data} />
      </div>
    );
  }

  const summary = [
    year(data.released),
    data.labels.map(loc).filter(Boolean)[0],
    data.genres.map(loc).filter(Boolean).slice(0, 2).join(', '),
  ].filter(Boolean).join(' · ') || pageFor(data.wikipedia)?.description || '';

  return (
    <div className={CARD} style={CARD_BG}>
      <ToggleHeader summary={summary} open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-white/[0.06]">
          <AlbumBody data={data} />
        </div>
      )}
    </div>
  );
}
