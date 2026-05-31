import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { searchTracks, getTrack } from '../lib/spotify.js';
import { searchSong } from '../lib/genius.js';
import { getTrackInfo } from '../lib/lastfm.js';
import { getTrackStats } from '../lib/setlistfm.js';
import { findVideo } from '../lib/youtube.js';
import { getTrackInfo as getYandexTrackInfo } from '../lib/yandex.js';
import { getAppleMusicData } from '../lib/applemusic.js';

const router = new OpenAPIHono();

// ── Schemas ──────────────────────────────────────────────────────────────────

const TrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
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
  encore_count: z.number(),
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
  chart: ChartEntrySchema.nullable(),
});

const AppleMusicChartSchema = z.object({ position: z.number(), country: z.literal('ru') });

const AppleMusicSchema = z.object({
  search_url: z.string(),
  chart: AppleMusicChartSchema.nullable(),
});

const TrackInfoSchema = z.object({
  spotify: TrackSchema,
  genius: GeniusSchema.nullable(),
  lastfm: LastfmSchema.nullable(),
  setlistfm: SetlistfmSchema.nullable(),
  youtube: YoutubeSchema,
  yandex: YandexSchema,
  apple_music: AppleMusicSchema,
});

const ErrorSchema = z.object({ error: z.string() });

// ── Routes ────────────────────────────────────────────────────────────────────

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

router.openapi(searchRoute, async (c) => {
  const { q, artist } = c.req.valid('query');
  const tracks = await searchTracks(q, artist);
  return c.json(tracks);
});

router.openapi(infoRoute, async (c) => {
  const { id } = c.req.valid('param');

  const spotifyTrack = await getTrack(id);
  if (!spotifyTrack) return c.json({ error: 'Track not found' }, 404);

  const { title: rawTitle, artist } = spotifyTrack;
  // Убираем суффиксы Spotify перед поиском в Genius/Last.fm/Setlist.fm
  const title = rawTitle.replace(
    /\s*[-–(]\s*(single version|remastered.*|radio edit|live.*|acoustic.*|demo.*|instrumental.*|extended.*|deluxe.*|feat\..*)\s*\)?$/i,
    ''
  ).trim();

  const [geniusResult, lastfmResult, setlistResult, youtubeResult, yandexResult, appleResult] =
    await Promise.allSettled([
      searchSong(title, artist),
      getTrackInfo(title, artist),
      getTrackStats(title, artist),
      findVideo(title, artist),
      getYandexTrackInfo(title, artist),
      getAppleMusicData(title, artist),
    ]);

  const genius = geniusResult.status === 'fulfilled' ? geniusResult.value : null;
  const lastfm = lastfmResult.status === 'fulfilled' ? lastfmResult.value : null;
  const setlistfm = setlistResult.status === 'fulfilled' ? setlistResult.value : null;
  const youtube =
    youtubeResult.status === 'fulfilled'
      ? youtubeResult.value
      : { video_id: null, url: '', search_url: '', view_count: null, like_count: null };
  const yandex =
    yandexResult.status === 'fulfilled'
      ? yandexResult.value
      : { url: null, search_url: `https://music.yandex.ru/search?text=${encodeURIComponent(`${artist} ${title}`)}`, likes_count: null, chart: null };
  const apple_music =
    appleResult.status === 'fulfilled'
      ? appleResult.value
      : { search_url: `https://music.apple.com/ru/search?term=${encodeURIComponent(`${artist} ${title}`)}`, chart: null };

  return c.json(
    { spotify: spotifyTrack, genius, lastfm, setlistfm, youtube, yandex, apple_music },
    200
  );
});

export default router;
