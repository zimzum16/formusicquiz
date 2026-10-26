import { Agent, fetch } from 'undici';
import { cacheGet, cacheSet } from './cache.js';
import {
  parseCriticRatings, parseSingles, parseCharts, parseCertifications, parsePersonnel,
  type Localized, type CriticRating, type Single, type ChartPeak, type Certification, type PersonnelGroup,
} from './wikitext.js';

export type { Localized, CriticRating, Single, ChartPeak, Certification, PersonnelGroup };

// Wikimedia без контакта (URL или email) в User-Agent даёт 10 запросов/мин вместо 200
const UA = process.env.WIKI_USER_AGENT || 'SoundLens/1.0 (https://github.com/zimzum16/formusicquiz)';
const WIKIMEDIA_CONCURRENCY = 3;  // рекомендация Wikimedia: не больше 3 параллельных запросов

// Стандартный fetch закрывает соединение через 4 с простоя, и следующий запрос платит
// ~1 с за новый TLS-хендшейк. Держим соединения минуту: 1.5 с → 0.3 с на запрос
const keepAlive = new Agent({ keepAliveTimeout: 60_000, keepAliveMaxTimeout: 120_000 });
const TIMEOUT = 8000;
const INFO_TTL_S = 14 * 24 * 60 * 60;
const PARTIAL_TTL_S = 60 * 60;  // часть источников не ответила — перезапросим скоро
const MISS_TTL_S = 24 * 60 * 60;

export interface WikiPage {
  title: string;
  url: string;
  description: string | null;
  extract: string | null;
  image: string | null;
}

export interface BandMember {
  name: string;
  periods: { begin: string | null; end: string | null }[];
  roles: string[];
}

export interface ArtistInfo {
  wikidata_id: string;
  name: Localized;
  wikipedia: { ru: WikiPage | null; en: WikiPage | null };
  founded: string | null;
  dissolved: string | null;
  country: Localized | null;
  genres: Localized[];
  members: BandMember[];
  rym_url: string | null;
  musicbrainz_id: string | null;
  pending: boolean;  // MusicBrainz не успел — состав и дата распада появятся при повторном запросе
}

export interface AlbumInfo {
  wikidata_id: string;
  title: Localized;
  wikipedia: { ru: WikiPage | null; en: WikiPage | null };
  released: string | null;
  labels: Localized[];
  producers: Localized[];
  genres: Localized[];
  critic_ratings: CriticRating[];
  community_rating: { value: number; votes: number } | null;
  singles: Single[];
  charts: ChartPeak[];
  certifications: Certification[];
  personnel: PersonnelGroup[];
  rym_url: string;
  musicbrainz_id: string | null;
  pending: boolean;  // MusicBrainz не успел — оценка слушателей (и синглы, если их нет в Википедии) появятся позже
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

let wikimediaActive = 0;
const wikimediaWaiting: (() => void)[] = [];

async function withWikimediaSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (wikimediaActive >= WIKIMEDIA_CONCURRENCY) await new Promise<void>(r => wikimediaWaiting.push(r));
  wikimediaActive++;
  try {
    return await fn();
  } finally {
    wikimediaActive--;
    wikimediaWaiting.shift()?.();
  }
}

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

async function request(url: string, retry = true): Promise<FetchResponse | null> {
  const doFetch = () => fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
    dispatcher: keepAlive,
  });
  const { hostname } = new URL(url);
  const res = /(^|\.)(wikipedia|wikidata)\.org$/.test(hostname) ? await withWikimediaSlot(doFetch) : await doFetch();

  // При всплеске отвечают 429/503 — один повтор, если просят подождать недолго
  if (retry && (res.status === 429 || res.status === 503)) {
    const wait = (Number(res.headers.get('retry-after')) || 1) * 1000;
    if (wait <= 3000) {
      await new Promise(r => setTimeout(r, wait));
      return request(url, false);
    }
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await request(url);
  return res ? (res.json() as Promise<T>) : null;
}

// Если вспомогательный источник упал — отдаём то, что есть, но помечаем ответ как неполный
// partial — какой-то источник упал; late — опоздавшие поля, которые допишутся в кэш позже
type Soft = { partial: boolean; late: Promise<object> | null };
async function soft<T>(p: Promise<T>, fallback: T, state: Soft): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error('[wikiinfo]', e);
    state.partial = true;
    return fallback;
  }
}

// MusicBrainz бывает медленным (2–5 с, иногда 503). Его запрос идёт параллельно с Википедией,
// а после неё ждём ещё не больше MB_GRACE_MS. Опоздавший ответ дописываем в кэш (см. cached)
const MB_GRACE_MS = 300;
const TIMED_OUT = Symbol('timed out');

async function budgeted<T>(p: Promise<T>, fallback: T, state: Soft): Promise<{ value: T; late: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>(r => { timer = setTimeout(() => r(TIMED_OUT), MB_GRACE_MS); });
  try {
    const r = await Promise.race([p, timeout]);
    return r === TIMED_OUT ? { value: fallback, late: true } : { value: r, late: false };
  } catch (e) {
    console.error('[wikiinfo]', e);
    state.partial = true;
    return { value: fallback, late: false };
  } finally {
    clearTimeout(timer);
  }
}

// ── Wikidata ──────────────────────────────────────────────────────────────────

interface Claim { rank: string; mainsnak: { datavalue?: { value: unknown } } }
interface Entity {
  labels?: Record<string, { value: string }>;
  aliases?: Record<string, { value: string }[]>;
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, { title: string }>;
}

function wd<T>(params: Record<string, string>): Promise<T | null> {
  return getJson<T>(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ ...params, format: 'json' })}`);
}

async function searchEntities(srsearch: string, limit: number): Promise<string[]> {
  const d = await wd<{ query?: { search: { title: string }[] } }>({
    action: 'query', list: 'search', srsearch, srlimit: String(limit),
  });
  return d?.query?.search.map(s => s.title) ?? [];
}

async function getEntities(ids: string[], props: string): Promise<Record<string, Entity>> {
  if (!ids.length) return {};
  const d = await wd<{ entities: Record<string, Entity> }>({
    action: 'wbgetentities', ids: ids.join('|'), props, languages: 'ru|en|mul', sitefilter: 'ruwiki|enwiki',
  });
  return d?.entities ?? {};
}

async function findByStatement(prop: string, value: string): Promise<string | null> {
  return (await searchEntities(`haswbstatement:${prop}=${value}`, 1))[0] ?? null;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');

// Поиск по названию: среди кандидатов с нужным свойством берём первого с точно совпавшим названием
async function findByName(name: string, statement: string): Promise<string | null> {
  const phrase = name.replace(/"/g, '').trim();
  if (!phrase) return null;
  const ids = await searchEntities(`"${phrase}" haswbstatement:${statement}`, 5);
  const entities = await getEntities(ids, 'labels|aliases');
  const target = norm(phrase);
  return ids.find(id => {
    const e = entities[id];
    const names = [
      ...Object.values(e?.labels ?? {}).map(l => l.value),
      ...Object.values(e?.aliases ?? {}).flat().map(a => a.value),
    ];
    return names.some(n => norm(n) === target);
  }) ?? null;
}

function claimValues(e: Entity, prop: string): unknown[] {
  return (e.claims?.[prop] ?? [])
    .filter(c => c.rank !== 'deprecated' && c.mainsnak.datavalue)
    .map(c => c.mainsnak.datavalue!.value);
}

const entityIds = (e: Entity, prop: string) =>
  claimValues(e, prop).map(v => (v as { id: string }).id);

const firstString = (e: Entity, prop: string) =>
  (claimValues(e, prop)[0] as string | undefined) ?? null;

// Самая ранняя дата с учётом точности: 9 — год, 10 — месяц, 11 — день
function earliestDate(e: Entity, prop: string): string | null {
  const times = claimValues(e, prop) as { time: string; precision: number }[];
  if (!times.length) return null;
  const t = times.reduce((a, b) => (b.time < a.time ? b : a));
  const iso = t.time.replace(/^\+/, '');
  return iso.slice(0, t.precision >= 11 ? 10 : t.precision === 10 ? 7 : 4);
}

// mul — общая для всех языков метка, Wikidata хранит в ней многие имена вместо en (например, Radiohead)
const localizedLabel = (e: Entity | undefined): Localized => ({
  ru: e?.labels?.ru?.value ?? e?.labels?.mul?.value ?? null,
  en: e?.labels?.en?.value ?? e?.labels?.mul?.value ?? null,
});

async function labelsOf(ids: string[]): Promise<Record<string, Localized>> {
  const entities = await getEntities([...new Set(ids)].slice(0, 50), 'labels');
  return Object.fromEntries(Object.entries(entities).map(([id, e]) => [id, localizedLabel(e)]));
}

const pickLabels = (labels: Record<string, Localized>, ids: string[]) =>
  ids.map(id => labels[id]).filter((l): l is Localized => !!l);

// ── Wikipedia ─────────────────────────────────────────────────────────────────

async function wikiSummary(lang: 'ru' | 'en', title: string): Promise<WikiPage | null> {
  const d = await getJson<{
    type: string;
    title: string;
    description?: string;
    extract?: string;
    thumbnail?: { source: string };
    content_urls?: { desktop?: { page: string } };
  }>(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!d || d.type === 'disambiguation') return null;
  return {
    title: d.title,
    url: d.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    description: d.description ?? null,
    extract: d.extract ?? null,
    image: d.thumbnail?.source ?? null,
  };
}

async function wikiPages(e: Entity, state: Soft) {
  const ruTitle = e.sitelinks?.ruwiki?.title;
  const enTitle = e.sitelinks?.enwiki?.title;
  const [ru, en] = await Promise.all([
    ruTitle ? soft(wikiSummary('ru', ruTitle), null, state) : null,
    enTitle ? soft(wikiSummary('en', enTitle), null, state) : null,
  ]);
  return { ru, en };
}

interface EnArticle {
  critic_ratings: CriticRating[];
  singles: Single[];
  charts: ChartPeak[];
  certifications: Certification[];
  personnel: PersonnelGroup[];
}

const NO_ARTICLE: EnArticle = { critic_ratings: [], singles: [], charts: [], certifications: [], personnel: [] };

// Одна загрузка английской статьи — все блоки из её разметки
async function enArticle(enTitle: string): Promise<EnArticle> {
  const res = await request(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(enTitle)}&action=raw`);
  if (!res) return NO_ARTICLE;
  const text = await res.text();
  return {
    critic_ratings: parseCriticRatings(text),
    singles: parseSingles(text),
    charts: parseCharts(text),
    certifications: parseCertifications(text),
    personnel: parsePersonnel(text),
  };
}

// ── MusicBrainz ───────────────────────────────────────────────────────────────

// Лимит MusicBrainz — 1 запрос в секунду, при превышении отвечает 503
let mbQueue: Promise<unknown> = Promise.resolve();

function mbFetch<T>(path: string): Promise<T | null> {
  const run = mbQueue.then(() => getJson<T>(`https://musicbrainz.org/ws/2${path}${path.includes('?') ? '&' : '?'}fmt=json`));
  mbQueue = run.catch(() => {}).then(() => new Promise(r => setTimeout(r, 1100)));
  return run;
}

interface MbRelation {
  type: string;
  direction: string;
  begin: string | null;
  end: string | null;
  attributes: string[];
  artist: { id: string; name: string };
}

interface MbGroup {
  members: BandMember[];
  dissolved: string | null;
}

async function mbGroup(mbid: string): Promise<MbGroup> {
  const d = await mbFetch<{
    type?: string;
    'life-span'?: { end: string | null; ended: boolean };
    relations?: MbRelation[];
  }>(`/artist/${mbid}?inc=artist-rels`);
  if (d?.type !== 'Group') return { members: [], dissolved: null };

  // Одна запись в MusicBrainz = один участник × один инструмент, сворачиваем по участнику
  const byId = new Map<string, BandMember>();
  for (const r of d.relations ?? []) {
    if (r.type !== 'member of band' || r.direction !== 'backward') continue;
    let m = byId.get(r.artist.id);
    if (!m) { m = { name: r.artist.name, periods: [], roles: [] }; byId.set(r.artist.id, m); }
    if (!m.periods.some(p => p.begin === r.begin && p.end === r.end)) m.periods.push({ begin: r.begin, end: r.end });
    for (const a of r.attributes) {
      const role = a.replace(/\s*\(.*\)$/, '');  // "drums (drum set)" → "drums"
      if (role !== 'original' && !m.roles.includes(role)) m.roles.push(role);
    }
  }

  const since = (m: BandMember) => m.periods[0]?.begin ?? '9999';
  const members = [...byId.values()];
  for (const m of members) m.periods.sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''));
  return {
    members: members.sort((a, b) => since(a).localeCompare(since(b)) || a.name.localeCompare(b.name)),
    dissolved: d['life-span']?.ended ? d['life-span'].end : null,
  };
}

interface MbReleaseGroup {
  community: AlbumInfo['community_rating'];
  singles: Single[];  // связь «single from» — запасной источник, если в Википедии нет {{Singles}}
}

async function mbReleaseGroup(mbid: string): Promise<MbReleaseGroup> {
  const d = await mbFetch<{
    rating?: { value: number | null; 'votes-count': number };
    relations?: { type: string; direction: string; release_group?: { title: string; 'first-release-date'?: string } }[];
  }>(`/release-group/${mbid}?inc=ratings+release-group-rels`);
  const singles = (d?.relations ?? [])
    .filter(r => r.type === 'single from' && r.direction === 'backward' && r.release_group)
    .map(r => ({ title: r.release_group!.title, date: r.release_group!['first-release-date'] || null }))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  return {
    community: d?.rating?.value != null ? { value: d.rating.value, votes: d.rating['votes-count'] } : null,
    singles,
  };
}

// ── Поиск сущности ────────────────────────────────────────────────────────────

const SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/;
const EDITION_RE = /\s*[([][^)\]]*(remaster|deluxe|edition|anniversary|expanded|version|reissue)[^)\]]*[)\]]/gi;

async function resolveArtist(id: string, name?: string): Promise<string | null> {
  let qid: string | null = null;
  const itunes = id.match(/^itunes:artist:(\d+)$/);
  if (itunes) qid = await findByStatement('P2850', itunes[1]);
  else if (SPOTIFY_ID_RE.test(id)) qid = await findByStatement('P1902', id);
  if (!qid && name) qid = await findByName(name, 'P434');
  return qid;
}

async function resolveAlbum(id: string, title?: string, artist?: string): Promise<string | null> {
  let qid: string | null = null;
  const itunes = id.match(/^itunes:album:(\d+)$/);
  const spotifyId = id.replace('spotify:album:', '');
  if (itunes) qid = await findByStatement('P2281', itunes[1]);
  else if (SPOTIFY_ID_RE.test(spotifyId)) qid = await findByStatement('P2205', spotifyId);

  // Переиздания (Deluxe, Remastered) обычно имеют свой Spotify ID, которого нет в Wikidata
  if (!qid && title) {
    const artistQid = artist ? await findByName(artist.split(',')[0], 'P434') : null;
    qid = await findByName(title.replace(EDITION_RE, '').trim(), artistQid ? `P175=${artistQid}` : 'P436');
  }
  return qid;
}

// ── Сборка ответа ─────────────────────────────────────────────────────────────

async function buildArtist(qid: string, state: Soft): Promise<ArtistInfo | null> {
  const e = (await getEntities([qid], 'labels|claims|sitelinks'))[qid];
  if (!e) return null;

  // У групп страна — P495, у людей — гражданство P27
  const countryId = entityIds(e, 'P495')[0] ?? entityIds(e, 'P27')[0];
  const genreIds = entityIds(e, 'P136').slice(0, 6);
  const mbid = firstString(e, 'P434');
  const rym = firstString(e, 'P5404');

  const noGroup: MbGroup = { members: [], dissolved: null };
  const groupRequest = mbid ? mbGroup(mbid) : Promise.resolve(noGroup);
  groupRequest.catch(() => {});  // ошибку разберёт budgeted, а до него — не unhandled rejection
  const [labels, wikipedia] = await Promise.all([
    soft(labelsOf([...(countryId ? [countryId] : []), ...genreIds]), {} as Record<string, Localized>, state),
    wikiPages(e, state),
  ]);
  const group = await budgeted(groupRequest, noGroup, state);

  // В Wikidata дата распада часто не заполнена (у Nirvana нет) — берём life-span из MusicBrainz
  const wdDissolved = earliestDate(e, 'P576');
  if (group.late) {
    state.late = groupRequest.then(g => ({ members: g.members, dissolved: wdDissolved ?? g.dissolved, pending: false }));
  }

  return {
    wikidata_id: qid,
    name: localizedLabel(e),
    wikipedia,
    founded: earliestDate(e, 'P571') ?? earliestDate(e, 'P569'),
    dissolved: wdDissolved ?? group.value.dissolved,
    country: countryId ? labels[countryId] ?? null : null,
    genres: pickLabels(labels, genreIds),
    members: group.value.members,
    rym_url: rym ? `https://rateyourmusic.com/artist/${encodeURIComponent(rym)}` : null,
    musicbrainz_id: mbid,
    pending: group.late,
  };
}

async function buildAlbum(qid: string, artistName: string | undefined, state: Soft): Promise<AlbumInfo | null> {
  const e = (await getEntities([qid], 'labels|claims|sitelinks'))[qid];
  if (!e) return null;

  const labelIds = entityIds(e, 'P264').slice(0, 3);
  const producerIds = entityIds(e, 'P162').slice(0, 5);
  const genreIds = entityIds(e, 'P136').slice(0, 6);
  const performerId = entityIds(e, 'P175')[0];
  const mbid = firstString(e, 'P436');
  const rym = firstString(e, 'P8392');
  const enTitle = e.sitelinks?.enwiki?.title;

  const noReleaseGroup: MbReleaseGroup = { community: null, singles: [] };
  const mbRequest = mbid ? mbReleaseGroup(mbid) : Promise.resolve(noReleaseGroup);
  mbRequest.catch(() => {});
  const [labels, wikipedia, article] = await Promise.all([
    soft(labelsOf([...labelIds, ...producerIds, ...genreIds, ...(performerId ? [performerId] : [])]), {} as Record<string, Localized>, state),
    wikiPages(e, state),
    enTitle ? soft(enArticle(enTitle), NO_ARTICLE, state) : NO_ARTICLE,
  ]);
  const mb = await budgeted(mbRequest, noReleaseGroup, state);
  // Синглы из Википедии точнее (с датами из карточки альбома), MusicBrainz — только если там пусто
  const pickSingles = (fromMb: Single[]) => (article.singles.length ? article.singles : fromMb);
  if (mb.late) {
    state.late = mbRequest.then(r => ({ community_rating: r.community, singles: pickSingles(r.singles), pending: false }));
  }

  const title = localizedLabel(e);
  const performer = artistName?.split(',')[0] ?? (performerId ? labels[performerId]?.en : null) ?? '';
  const searchTerm = `${performer} ${title.en ?? title.ru ?? ''}`.trim();

  return {
    wikidata_id: qid,
    title,
    wikipedia,
    released: earliestDate(e, 'P577'),
    labels: pickLabels(labels, labelIds),
    producers: pickLabels(labels, producerIds),
    genres: pickLabels(labels, genreIds),
    critic_ratings: article.critic_ratings,
    community_rating: mb.value.community,
    singles: pickSingles(mb.value.singles),
    charts: article.charts,
    certifications: article.certifications,
    personnel: article.personnel,
    // У большинства альбомов RYM ID в Wikidata нет — ведём на поиск, чтобы не получить 404
    rym_url: rym
      ? `https://rateyourmusic.com/release/${encodeURI(rym.replace(/\/+$/, ''))}/`
      : `https://rateyourmusic.com/search?searchtype=l&searchterm=${encodeURIComponent(searchTerm)}`,
    musicbrainz_id: mbid,
    pending: mb.late,
  };
}

async function cached<T>(key: string, load: (state: Soft) => Promise<T | null>): Promise<T | null> {
  const hit = await cacheGet<{ v: T | null }>(key);
  if (hit) return hit.v;
  const state: Soft = { partial: false, late: null };
  const v = await load(state);
  // Не ждём записи в Redis — это лишний HTTPS-запрос перед ответом; в памяти значение появляется сразу
  cacheSet(key, { v }, v === null ? MISS_TTL_S : state.partial || state.late ? PARTIAL_TTL_S : INFO_TTL_S)
    .catch(e => console.error('[wikiinfo] cache', e));
  if (v !== null && state.late) {
    state.late
      .then(patch => cacheSet(key, { v: { ...v, ...patch } }, state.partial ? PARTIAL_TTL_S : INFO_TTL_S))
      .catch(e => console.error('[wikiinfo] late', e));
  }
  return v;
}

export function getArtistInfo(id: string, name?: string): Promise<ArtistInfo | null> {
  // Имя — в ключе: при поиске по названию разные артисты могут прийти с одинаковым ID
  return cached(`wiki:artist:v4:${id}|${name ?? ''}`, async state => {
    const qid = await resolveArtist(id, name);
    return qid ? buildArtist(qid, state) : null;
  });
}

export function getAlbumInfo(id: string, title?: string, artist?: string): Promise<AlbumInfo | null> {
  return cached(`wiki:album:v7:${id}|${title ?? ''}|${artist ?? ''}`, async state => {
    const qid = await resolveAlbum(id, title, artist);
    return qid ? buildAlbum(qid, artist, state) : null;
  });
}
