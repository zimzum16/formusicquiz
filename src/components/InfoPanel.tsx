import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { infoApi, type ArtistInfo, type AlbumInfo, type Localized, type WikiPage, type BandMember } from '../lib/api';
import { t, lang } from '../i18n';
import { useInfo, useTrackInfo } from '../hooks/useInfo';
import { ShowMoreButton } from './CollapsibleList';

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
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T00:00:00Z`).toLocaleDateString(locale, {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).replace(/\s*г\.$/, '');
  }
  if (/^\d{4}-\d{2}$/.test(d)) {
    return new Date(`${d}-01T00:00:00Z`).toLocaleDateString(locale, {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    }).replace(/\s*г\.$/, '');
  }
  return d.length >= 4 && /^\d{4}/.test(d) ? d.slice(0, 4) : d;
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
        <ShowMoreButton expanded={all} hidden={hidden} onToggle={() => setAll(!all)} />
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

const LIST_LIMIT = 6;

// Строки «название — значение» с раскрытием «+ ещё N»
function ExpandableRows<T>({ label, items, rowKey, left, right, limit = LIST_LIMIT }: {
  label: string;
  items: T[];
  rowKey: (item: T) => string;
  left: (item: T) => React.ReactNode;
  right: (item: T) => React.ReactNode;
  limit?: number;
}) {
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const visible = all ? items : items.slice(0, limit);
  const hidden = items.length - limit;

  return (
    <div className="flex flex-col gap-2">
      <span className={LBL} style={SANS}>{label}</span>
      <div className="flex flex-col">
        {visible.map(item => (
          <div key={rowKey(item)} className="flex items-baseline justify-between gap-3 py-1 border-b border-white/[0.05] last:border-0">
            <span className="text-[12px] text-white/85 min-w-0" style={SANS}>{left(item)}</span>
            <span className="text-[12px] font-semibold text-white flex-shrink-0 text-right" style={MONO}>{right(item)}</span>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <ShowMoreButton expanded={all} hidden={hidden} onToggle={() => setAll(!all)} />
      )}
    </div>
  );
}

// Главные чарты — Billboard 200 / Hot 100 и UK Albums / Singles, дальше по позиции
const chartPriority = (chart: string) => {
  const key = chart.toLowerCase().replace(/[\s\d]/g, '');
  if (key === 'billboard' || key === 'billboardhot') return 0;
  return key === 'uk' || key === 'uksinglesbyname' ? 1 : 2;
};

const sortCharts = (charts: { chart: string; name: Localized; peak: number }[]) =>
  [...charts].sort((a, b) =>
    chartPriority(a.chart) - chartPriority(b.chart) || a.peak - b.peak || (loc(a.name) ?? '').localeCompare(loc(b.name) ?? ''));

const AWARDS: Record<string, Localized> = {
  diamond: { ru: 'бриллиантовый', en: 'Diamond' },
  platinum: { ru: 'платиновый', en: 'Platinum' },
  gold: { ru: 'золотой', en: 'Gold' },
  silver: { ru: 'серебряный', en: 'Silver' },
};

const AWARD_WEIGHT: Record<string, number> = { diamond: 10, platinum: 1, gold: 0.5, silver: 0.25 };

// Сначала США и Великобритания, дальше по «весу» сертификата
const sortCertifications = (certs: AlbumInfo['certifications']) => {
  const priority = (c: AlbumInfo['certifications'][number]) =>
    c.region.en === 'United States' ? 0 : c.region.en === 'United Kingdom' ? 1 : 2;
  const weight = (c: AlbumInfo['certifications'][number]) => (AWARD_WEIGHT[c.award] ?? 0) * c.multiplier;
  return [...certs].sort((a, b) => priority(a) - priority(b) || weight(b) - weight(a));
};

function certLabel(c: AlbumInfo['certifications'][number]) {
  const award = loc(AWARDS[c.award]) ?? c.award;
  const units = c.units ? ` · ${c.units.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}` : '';
  return `${c.multiplier > 1 ? `${c.multiplier}× ` : ''}${award}${units}`;
}

const GROUP_TITLES_RU: Record<string, string> = {
  'technical': 'Технический персонал',
  'technical personnel': 'Технический персонал',
  'production': 'Продакшн',
  'production personnel': 'Продакшн',
  'artwork': 'Оформление',
  'design': 'Оформление',
  'artwork and design': 'Оформление',
  'packaging': 'Оформление',
  'other musicians': 'Приглашённые музыканты',
  'additional musicians': 'Приглашённые музыканты',
  'additional personnel': 'Приглашённые музыканты',
  'guest musicians': 'Приглашённые музыканты',
  'featured artists': 'Приглашённые исполнители',
  'orchestra': 'Оркестр',
};

const groupTitle = (title: string) =>
  lang === 'ru' ? GROUP_TITLES_RU[title.toLowerCase()] ?? title : title;

const PERSONNEL_LIMIT = 8;

// Участники записи из раздела «Personnel»; роли — как в статье, на английском
function Personnel({ groups }: { groups: AlbumInfo['personnel'] }) {
  const [all, setAll] = useState(false);
  const total = groups.reduce((n, g) => n + g.people.length, 0);
  if (!total) return null;

  // Первыми идут музыканты группы — обычно это первая подгруппа; лимит считаем по людям
  let budget = all ? Infinity : PERSONNEL_LIMIT;
  const visible = groups
    .map(g => {
      const people = g.people.slice(0, Math.max(0, budget));
      budget -= people.length;
      return { ...g, people };
    })
    .filter(g => g.people.length);

  return (
    <div className="flex flex-col gap-2">
      <span className={LBL} style={SANS}>{t.info_personnel}</span>
      {visible.map((g, i) => (
        <div key={`${g.title}-${i}`} className="flex flex-col gap-1.5">
          {g.title && <span className="text-[11px] font-semibold text-[#2DD4BF]/80" style={SANS}>{groupTitle(g.title)}</span>}
          {g.people.map((p, j) => (
            <div key={`${p.name}-${j}`} className="flex flex-col" style={SANS}>
              <span className="text-[12px] font-semibold text-white">{p.name}</span>
              {p.roles && <span className="text-[11px] leading-snug text-[#8a8a8a]">{p.roles}</span>}
            </div>
          ))}
        </div>
      ))}
      {total > PERSONNEL_LIMIT && (
        <ShowMoreButton expanded={all} hidden={total - PERSONNEL_LIMIT} onToggle={() => setAll(!all)} />
      )}
    </div>
  );
}

// Высота — как у треклиста (родитель задаёт её через relative + absolute inset-0),
// лишнее скрыто под градиентом и раскрывается кнопкой
function FittedCard({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const check = () => setOverflows(content.scrollHeight > viewport.clientHeight + 1);
    const ro = new ResizeObserver(check);
    ro.observe(viewport);
    ro.observe(content);
    check();
    return () => ro.disconnect();
  }, []);

  const toggle = () => {
    if (expanded) cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setExpanded(!expanded);
  };

  return (
    <div ref={cardRef} className={`${CARD} flex flex-col ${expanded ? '' : 'absolute inset-0'}`} style={CARD_BG}>
      <div ref={viewportRef} className={`relative flex-1 min-h-0 ${expanded ? '' : 'overflow-hidden'}`}>
        <div ref={contentRef} className="p-4">{children}</div>
        {!expanded && overflows && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ background: 'linear-gradient(to bottom, rgba(24,24,28,0), rgba(24,24,28,.95))' }}
          />
        )}
      </div>
      {(overflows || expanded) && (
        <button
          onClick={toggle}
          className="flex items-center justify-center gap-1 py-2.5 border-t border-white/[0.06] text-[11px] font-semibold text-[#8a8a8a] hover:text-white transition-colors flex-shrink-0"
          style={SANS}
        >
          {expanded ? t.info_less : t.info_expand}
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

// Только факты, без текста статьи — он есть по ссылкам на Википедию
function AlbumBody({ data, singles }: { data: AlbumInfo; singles: AlbumInfo['singles'] }) {
  const join = (ls: Localized[]) => ls.map(loc).filter(Boolean).join(', ') || null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact label={t.label_release_date} value={fmtDate(data.released)} />
        <Fact label={t.info_label} value={join(data.labels)} />
        <Fact label={t.label_producer} value={join(data.producers)} />
        <Fact label={t.info_genres} value={join(data.genres)} />
      </div>
      <ExpandableRows
        label={t.info_singles}
        items={singles}
        rowKey={s => s.title}
        left={s => s.title}
        right={s => fmtDate(s.date)}
      />
      <Personnel groups={data.personnel} />
      <ExpandableRows
        label={t.info_charts}
        items={sortCharts(data.charts)}
        rowKey={c => c.chart}
        left={c => loc(c.name)}
        right={c => `#${c.peak}`}
      />
      <ExpandableRows
        label={t.info_certifications}
        items={sortCertifications(data.certifications)}
        rowKey={c => `${c.region.en}-${c.award}-${c.multiplier}`}
        left={c => loc(c.region)}
        right={certLabel}
        limit={4}
      />
      <ExpandableRows
        label={t.info_critics}
        items={data.critic_ratings}
        rowKey={r => r.source}
        left={r => r.source}
        right={r => r.score}
      />
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

type AlbumSingle = AlbumInfo['singles'][number];

function fmtDateShort(d: string | null) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return fmtDate(d);
  return new Date(`${d}T00:00:00Z`)
    .toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .replace(/\s*г\.$/, '');
}

export function SingleBadge({ single }: { single: AlbumSingle }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className="px-1.5 py-[2px] rounded text-[9px] leading-none font-bold uppercase tracking-[0.08em]"
        style={{ color: '#2DD4BF', background: 'rgba(45,212,191,.12)', ...SANS }}
      >
        {t.info_single_badge}
      </span>
      {single.date && <span>{fmtDateShort(single.date)}</span>}
    </span>
  );
}

// На десктопе — колонка справа от треклиста, на мобильном — сворачиваемый блок над ним.
// singles — синглы, которых нет в треклисте (остальные помечены в нём самом)
export function AlbumInfoPanel({ data, loading, singles }: {
  data: AlbumInfo | null;
  loading: boolean;
  singles: AlbumSingle[];
}) {
  const wide = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);

  if (loading) return <Skeleton />;
  if (!data) return null;

  if (wide) {
    return (
      <FittedCard>
        <AlbumBody data={data} singles={singles} />
      </FittedCard>
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
          <AlbumBody data={data} singles={singles} />
        </div>
      )}
    </div>
  );
}

// Позиции песни в чартах для карточки Genius; нет данных — ничего не рисуем,
// и соседний блок связей занимает всю ширину
export function TrackCharts({ track }: { track: { id: string; title: string; artist: string } }) {
  const { data } = useTrackInfo(track);
  if (!data?.charts.length) return null;
  return (
    <div className="flex-1 min-w-0">
      <ExpandableRows
        label={t.info_charts}
        items={sortCharts(data.charts)}
        rowKey={c => c.chart}
        left={c => loc(c.name)}
        right={c => `#${c.peak}`}
        limit={5}
      />
    </div>
  );
}
