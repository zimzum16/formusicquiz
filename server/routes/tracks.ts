import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { searchTracks, getTrack } from '../lib/spotify.js';
import { searchSong } from '../lib/genius.js';
import { extractLyricsText } from '../lib/lyricsCompare.js';
import { getTrackInfo } from '../lib/lastfm.js';
import { getTrackStats } from '../lib/setlistfm.js';
import { findVideo } from '../lib/youtube.js';
import { getTrackInfo as getYandexTrackInfo } from '../lib/yandex.js';
import { getAppleMusicData } from '../lib/applemusic.js';
import { hasCyrillic, cyrToLat, latToCyr, looksLikeKeyboardMismatch, keyboardToLatin } from '../lib/translit.js';

const router = new OpenAPIHono();

// ── Schemas ──────────────────────────────────────────────────────────────────

const TrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  artist_id: z.string(),
  album: z.string(),
  release_date: z.string(),
  duration_ms: z.number(),
  preview_url: z.string().nullable(),
  cover_url: z.string().nullable(),
  spotify_url: z.string(),
  popularity: z.number().nullable(),
});


const ArtistRefSchema = z.object({ name: z.string(), url: z.string() });
const RelatedSongSchema = z.object({ title: z.string(), artist: z.string(), genius_url: z.string() });
const MediaSchema = z.object({ type: z.string(), url: z.string() });

const GeniusSchema = z.object({
  lyrics_url: z.string(),
  description: z.string().nullable(),
  release_date: z.string().nullable(),
  release_year: z.number().nullable(),
  language: z.string().nullable(),
  pageviews: z.number().nullable(),
  song_art_image_url: z.string().nullable(),
  media: z.array(MediaSchema),
  writer_artists: z.array(ArtistRefSchema),
  producer_artists: z.array(ArtistRefSchema),
  featured_artists: z.array(ArtistRefSchema),
  samples: z.array(RelatedSongSchema),
  sampled_in: z.array(RelatedSongSchema),
  interpolates: z.array(RelatedSongSchema),
  interpolated_by: z.array(RelatedSongSchema),
  cover_of: z.array(RelatedSongSchema),
  covered_by: z.array(RelatedSongSchema),
  remix_of: z.array(RelatedSongSchema),
  remixes: z.array(RelatedSongSchema),
  live_version_of: z.array(RelatedSongSchema),
});

const LastfmSchema = z.object({
  listeners: z.number(),
  playcount: z.number(),
  url: z.string(),
  tags: z.array(z.object({ name: z.string(), url: z.string() })),
  similar: z.array(z.object({ title: z.string(), artist: z.string(), url: z.string() })),
});

const PerformanceSchema = z.object({
  date: z.string(),
  venue: z.string(),
  city: z.string(),
  tour: z.string().nullable(),
});

const SetlistfmSchema = z.object({
  total_performances: z.number(),
  url: z.string(),
  first_performance: PerformanceSchema.nullable(),
  last_performance: PerformanceSchema.nullable(),
});

const YoutubeSchema = z.object({
  video_id: z.string().nullable(),
  url: z.string(),
  search_url: z.string(),
  view_count: z.number().nullable(),
  like_count: z.number().nullable(),
});

const ChartEntrySchema = z.object({ position: z.number(), progress: z.enum(['up', 'down', 'same']) });

const YandexSchema = z.object({
  url: z.string().nullable(),
  search_url: z.string(),
  likes_count: z.number().nullable(),
  play_count: z.number().nullable(),
  chart: ChartEntrySchema.nullable(),
});

const AppleMusicChartSchema = z.object({ position: z.number(), country: z.string() });

const AppleMusicSchema = z.object({
  search_url: z.string(),
  charts: z.array(AppleMusicChartSchema),
});

const TrackInfoSchema = z.object({
  spotify: TrackSchema,
  genius: GeniusSchema.nullable(),
  lastfm: LastfmSchema.nullable(),
  youtube: YoutubeSchema,
  yandex: YandexSchema,
  apple_music: AppleMusicSchema,
});

const ErrorSchema = z.object({ error: z.string() });

// ── Helpers ───────────────────────────────────────────────────────────────────

type SectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'unknown';

interface GeniusLyricsSection {
  type: SectionType;
  label: string;
  lines: string[];
}

function mapSectionType(name: string): SectionType {
  const lower = name.toLowerCase();
  if (/verse|куплет/.test(lower)) return 'verse';
  if (/bridge|бридж/.test(lower)) return 'bridge';
  if (/intro|интро/.test(lower)) return 'intro';
  if (/outro|аутро|coda/.test(lower)) return 'outro';
  // pre/post-chorus checked before chorus to avoid partial match
  if (/pre-chorus|pre chorus|пред.припев/.test(lower)) return 'unknown';
  if (/post-chorus|post chorus|пост.припев/.test(lower)) return 'unknown';
  if (/chorus|припев|refrain|hook/.test(lower)) return 'chorus';
  return 'unknown';
}

function formatSectionLabel(name: string): string {
  // Strip artist attribution after colon: "Verse 1: Drake" → "Verse 1"
  const clean = name.split(':')[0].trim();
  return clean
    // pre/post must come before chorus to avoid partial substitution
    .replace(/\bpre-chorus\b/i, 'Пред-припев')
    .replace(/\bpost-chorus\b/i, 'Пост-припев')
    .replace(/\bpre chorus\b/i, 'Пред-припев')
    .replace(/\bpost chorus\b/i, 'Пост-припев')
    .replace(/\bverse\b/i, 'Куплет')
    .replace(/\bchorus\b/i, 'Припев')
    .replace(/\bbridge\b/i, 'Бридж')
    .replace(/\bintro\b/i, 'Интро')
    .replace(/\boutro\b/i, 'Аутро')
    .replace(/\bhook\b/i, 'Хук')
    .replace(/\brefrain\b/i, 'Припев');
}

function parseGeniusLyrics(html: string): GeniusLyricsSection[] {
  let text = extractLyricsText(html);
  if (!text) return [];

  // Если маркер секции приклеен к тексту ("Read More [Verse 1]") — выносим на отдельную строку
  text = text.replace(/[^\n]*(\[[A-Z][^\]\n]{0,40}\])/g, (match, marker) => {
    const before = match.slice(0, match.length - marker.length).trim();
    return before ? `${before}\n${marker}` : marker;
  });

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const sections: GeniusLyricsSection[] = [];
  let current: GeniusLyricsSection | null = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      if (current && current.lines.length > 0) sections.push(current);
      const name = sectionMatch[1];
      current = { type: mapSectionType(name), label: formatSectionLabel(name), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current && current.lines.length > 0) sections.push(current);
  return sections;
}

// ── In-memory cache ───────────────────────────────────────────────────────────

const TRACK_CACHE_TTL = 60 * 60 * 1000;
type TrackInfoPayload = {
  spotify: z.infer<typeof TrackSchema>;
  genius: z.infer<typeof GeniusSchema> | null;
  lastfm: z.infer<typeof LastfmSchema> | null;
  youtube: z.infer<typeof YoutubeSchema>;
  yandex: z.infer<typeof YandexSchema>;
  apple_music: z.infer<typeof AppleMusicSchema>;
};
const trackCache = new Map<string, { data: TrackInfoPayload; ts: number }>();
const setlistCache = new Map<string, { data: z.infer<typeof SetlistfmSchema> | null; ts: number }>();
const lyricsCache = new Map<string, { data: { sections: GeniusLyricsSection[] }; ts: number }>();
const lrcCache = new Map<string, { data: { lines: { time: number; text: string }[] }; ts: number }>();

// ── Routes ────────────────────────────────────────────────────────────────────

const TITLE_RE = /\s*[-–(]\s*(single version|\d{4}\s+remaster.*|remaster(ed)?.*|radio edit|live.*|acoustic.*|demo.*|instrumental.*|extended.*|deluxe.*|feat\..*)\s*\)?$/i;

const lrcRoute = createRoute({
  method: 'get',
  path: '/lrc',
  request: {
    query: z.object({
      title: z.string().min(1),
      artist: z.string().min(1),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            lines: z.array(z.object({ time: z.number(), text: z.string() })),
          }),
        },
      },
      description: 'LRC строки из lrclib.net',
    },
  },
});

const searchRoute = createRoute({
  method: 'get',
  path: '/search',
  request: {
    query: z.object({
      q: z.string().min(1),
      artist: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(TrackSchema) } },
      description: 'Список треков',
    },
  },
});

const setlistfmRoute = createRoute({
  method: 'get',
  path: '/:id/setlistfm',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: SetlistfmSchema.nullable() } },
      description: 'Данные Setlist.fm',
    },
  },
});

const lyricsRoute = createRoute({
  method: 'get',
  path: '/lyrics',
  request: {
    query: z.object({
      url: z.string().optional(),
      title: z.string().optional(),
      artist: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            sections: z.array(z.object({
              type: z.string(),
              label: z.string(),
              lines: z.array(z.string()),
            })),
          }),
        },
      },
      description: 'Секции текста песни',
    },
  },
});

const infoRoute = createRoute({
  method: 'get',
  path: '/:id/info',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: TrackInfoSchema } },
      description: 'Полная информация о треке',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Трек не найден',
    },
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────

router.openapi(lrcRoute, async (c) => {
  const { title, artist } = c.req.valid('query');
  const cacheKey = `lrc:${title}|${artist}`;
  const cached = lrcCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TRACK_CACHE_TTL) return c.json(cached.data, 200);

  try {
    const params = new URLSearchParams({ track_name: title, artist_name: artist });
    const res = await fetch(`https://lrclib.net/api/search?${params}`, {
      headers: { 'Lrclib-Client': 'SoundLens/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return c.json({ lines: [] }, 200);

    const results = (await res.json()) as { syncedLyrics: string | null }[];
    const hit = results.find(r => r.syncedLyrics);
    if (!hit?.syncedLyrics) return c.json({ lines: [] }, 200);

    const LRC_LINE_RE = /^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/;
    const lines = hit.syncedLyrics
      .split('\n')
      .map(line => {
        const m = line.match(LRC_LINE_RE);
        if (!m) return null;
        const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
        const text = m[3].trim();
        if (!text || text === '♪' || text === '🎵') return null;
        return { time, text };
      })
      .filter((l): l is { time: number; text: string } => l !== null);

    const data = { lines };
    lrcCache.set(cacheKey, { data, ts: Date.now() });
    return c.json(data, 200);
  } catch {
    return c.json({ lines: [] }, 200);
  }
});

router.openapi(lyricsRoute, async (c) => {
  const query = c.req.valid('query');

  // Получаем URL страницы: либо напрямую, либо через поиск Genius по title+artist
  let lyricsUrl: string;
  if (query.url) {
    lyricsUrl = query.url;
  } else if (query.title && query.artist) {
    const cacheKey = `ta:${query.title}|${query.artist}`;
    const cached = lyricsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < TRACK_CACHE_TTL) return c.json(cached.data, 200);

    const genius = await searchSong(query.title, query.artist).catch((e) => {
      console.error('[lyrics] searchSong error:', e);
      return null;
    });
    if (!genius) {
      console.error('[lyrics] genius not found for', query.title, query.artist);
      return c.json({ sections: [] }, 200);
    }
    lyricsUrl = genius.lyrics_url;
    console.log('[lyrics] found url:', lyricsUrl);
  } else {
    return c.json({ sections: [] }, 200);
  }

  const cached = lyricsCache.get(lyricsUrl);
  if (cached && Date.now() - cached.ts < TRACK_CACHE_TTL) return c.json(cached.data, 200);

  try {
    const scraperapiKey = process.env.SCRAPERAPI_KEY;
    const proxyBase = process.env.SCRAPE_PROXY_URL;

    let fetchUrl: string;
    let fetchHeaders: Record<string, string> = {};

    if (scraperapiKey) {
      fetchUrl = `http://api.scraperapi.com?api_key=${scraperapiKey}&url=${encodeURIComponent(lyricsUrl)}`;
    } else if (proxyBase) {
      fetchUrl = `${proxyBase}/api/scrape?url=${encodeURIComponent(lyricsUrl)}`;
    } else {
      fetchUrl = lyricsUrl;
      fetchHeaders = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      };
    }

    const via = scraperapiKey ? '(via scraperapi)' : proxyBase ? '(via proxy)' : '(direct)';
    const res = await fetch(fetchUrl, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(15000),
    });

    console.log('[lyrics] genius page status:', res.status, via, 'for', lyricsUrl);
    if (!res.ok) return c.json({ sections: [] }, 200);

    const html = await res.text();
    console.log('[lyrics] html length:', html.length, 'has container:', html.includes('data-lyrics-container'));
    const sections = parseGeniusLyrics(html);
    console.log('[lyrics] parsed sections:', sections.length);
    const data = { sections };
    lyricsCache.set(lyricsUrl, { data, ts: Date.now() });
    if (!('url' in query)) {
      lyricsCache.set(`ta:${query.title}|${query.artist}`, { data, ts: Date.now() });
    }
    return c.json(data, 200);
  } catch (e) {
    console.error('[lyrics] fetch error:', e);
    return c.json({ sections: [] }, 200);
  }
});

router.openapi(searchRoute, async (c) => {
  const { q, artist } = c.req.valid('query');
  const isCyr = hasCyrillic(q);
  let altQ: string | null = null;

  if (isCyr) {
    altQ = looksLikeKeyboardMismatch(q) ? keyboardToLatin(q) : cyrToLat(q);
  } else {
    const cyr = latToCyr(q);
    if (cyr !== q) altQ = cyr;
  }

  const [a, b] = await Promise.all([
    searchTracks(q, artist),
    altQ ? searchTracks(altQ, artist) : Promise.resolve([]),
  ]);

  // Для кириллицы альтернативный запрос важнее (транслит или раскладка)
  const [primary, secondary] = isCyr ? [b, a] : [a, b];
  const seen = new Set(primary.map(t => t.id));
  const merged = [...primary, ...secondary.filter(t => !seen.has(t.id))];
  return c.json(merged.slice(0, 20));
});

router.openapi(infoRoute, async (c) => {
  const { id } = c.req.valid('param');

  const cached = trackCache.get(id);
  if (cached && Date.now() - cached.ts < TRACK_CACHE_TTL) return c.json(cached.data, 200);

  const spotifyTrack = await getTrack(id);
  if (!spotifyTrack) return c.json({ error: 'Track not found' }, 404);

  const { title: rawTitle, artist } = spotifyTrack;
  // Убираем суффиксы Spotify перед поиском в Genius/Last.fm/Setlist.fm
  const title = rawTitle.replace(TITLE_RE, '').trim();
  // Genius плохо ищет по "Artist1, Artist2 Title" — берём только первого исполнителя
  const primaryArtist = artist.split(',')[0].trim();

  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
    Promise.race([p, new Promise<null>(resolve => setTimeout(() => resolve(null), ms))]);

  const [geniusResult, lastfmResult, youtubeResult, yandexResult, appleResult] =
    await Promise.allSettled([
      withTimeout(searchSong(title, primaryArtist), 7000),
      withTimeout(getTrackInfo(title, artist), 7000),
      withTimeout(findVideo(title, artist), 7000),
      withTimeout(getYandexTrackInfo(title, artist), 4000),
      withTimeout(getAppleMusicData(title, artist), 4000),
    ]);

  const genius = geniusResult.status === 'fulfilled' ? geniusResult.value : null;
  const lastfm = lastfmResult.status === 'fulfilled' ? lastfmResult.value : null;
  const youtube =
    youtubeResult.status === 'fulfilled' && youtubeResult.value
      ? youtubeResult.value
      : { video_id: null, url: '', search_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title}`)}`, view_count: null, like_count: null };
  const yandex =
    yandexResult.status === 'fulfilled' && yandexResult.value
      ? yandexResult.value
      : { url: null, search_url: `https://music.yandex.ru/search?text=${encodeURIComponent(`${artist} ${title}`)}`, likes_count: null, play_count: null, chart: null };
  const apple_music =
    appleResult.status === 'fulfilled' && appleResult.value
      ? appleResult.value
      : { search_url: `https://music.apple.com/ru/search?term=${encodeURIComponent(`${artist} ${title}`)}`, charts: [] };
  const payload: TrackInfoPayload = { spotify: spotifyTrack, genius, lastfm, youtube, yandex, apple_music };
  trackCache.set(id, { data: payload, ts: Date.now() });
  return c.json(payload, 200);
});

router.openapi(setlistfmRoute, async (c) => {
  const { id } = c.req.valid('param');

  const cached = setlistCache.get(id);
  if (cached && Date.now() - cached.ts < TRACK_CACHE_TTL) return c.json(cached.data, 200);

  const spotifyTrack = await getTrack(id);
  if (!spotifyTrack) return c.json(null, 200);

  const { title: rawTitle, artist } = spotifyTrack;
  const title = rawTitle.replace(TITLE_RE, '').trim();

  const data = await getTrackStats(title, artist).catch(() => null);
  setlistCache.set(id, { data, ts: Date.now() });
  return c.json(data, 200);
});

export default router;
