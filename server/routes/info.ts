import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getArtistInfo, getAlbumInfo } from '../lib/wikiinfo.js';

const router = new OpenAPIHono();

// ── Schemas ──────────────────────────────────────────────────────────────────

const LocalizedSchema = z.object({ ru: z.string().nullable(), en: z.string().nullable() });

const WikiPageSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  extract: z.string().nullable(),
  image: z.string().nullable(),
});

const WikipediaSchema = z.object({ ru: WikiPageSchema.nullable(), en: WikiPageSchema.nullable() });

const ArtistInfoSchema = z.object({
  wikidata_id: z.string(),
  name: LocalizedSchema,
  wikipedia: WikipediaSchema,
  founded: z.string().nullable(),
  dissolved: z.string().nullable(),
  country: LocalizedSchema.nullable(),
  genres: z.array(LocalizedSchema),
  members: z.array(z.object({
    name: z.string(),
    periods: z.array(z.object({ begin: z.string().nullable(), end: z.string().nullable() })),
    roles: z.array(z.string()),
  })),
  rym_url: z.string().nullable(),
  musicbrainz_id: z.string().nullable(),
  pending: z.boolean(),
});

const AlbumInfoSchema = z.object({
  wikidata_id: z.string(),
  title: LocalizedSchema,
  wikipedia: WikipediaSchema,
  released: z.string().nullable(),
  labels: z.array(LocalizedSchema),
  producers: z.array(LocalizedSchema),
  genres: z.array(LocalizedSchema),
  critic_ratings: z.array(z.object({ source: z.string(), score: z.string() })),
  community_rating: z.object({ value: z.number(), votes: z.number() }).nullable(),
  singles: z.array(z.object({ title: z.string(), date: z.string().nullable() })),
  charts: z.array(z.object({ chart: z.string(), name: LocalizedSchema, peak: z.number() })),
  certifications: z.array(z.object({
    region: LocalizedSchema,
    award: z.string(),
    multiplier: z.number(),
    units: z.number().nullable(),
  })),
  rym_url: z.string(),
  musicbrainz_id: z.string().nullable(),
  pending: z.boolean(),
});

const ErrorSchema = z.object({ error: z.string() });

// ── Routes ────────────────────────────────────────────────────────────────────

const artistInfoRoute = createRoute({
  method: 'get',
  path: '/artist/:id',
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ name: z.string().optional() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ArtistInfoSchema.nullable() } },
      description: 'Справка об артисте из Wikidata/Wikipedia/MusicBrainz; null — не найден',
    },
    502: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Внешние источники недоступны',
    },
  },
});

router.openapi(artistInfoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { name } = c.req.valid('query');
  try {
    return c.json(await getArtistInfo(id, name), 200);
  } catch (e) {
    console.error('[info/artist]', e);
    return c.json({ error: 'upstream failed' }, 502);
  }
});

const albumInfoRoute = createRoute({
  method: 'get',
  path: '/album/:id',
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ title: z.string().optional(), artist: z.string().optional() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: AlbumInfoSchema.nullable() } },
      description: 'Справка об альбоме, оценки критиков; null — не найден',
    },
    502: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Внешние источники недоступны',
    },
  },
});

router.openapi(albumInfoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { title, artist } = c.req.valid('query');
  try {
    return c.json(await getAlbumInfo(id, title, artist), 200);
  } catch (e) {
    console.error('[info/album]', e);
    return c.json({ error: 'upstream failed' }, 502);
  }
});

export default router;
