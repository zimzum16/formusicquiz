const BASE = 'https://api.genius.com';

const PAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html',
};

interface GeniusArtistRef {
  name: string;
  url: string;
}

interface GeniusRelatedSong {
  title: string;
  artist: string;
  genius_url: string;
}

interface GeniusMedia {
  type: string;
  url: string;
}

export interface GeniusSong {
  lyrics_url: string;
  title: string;
  artist: string;
  description: string | null;
  release_date: string | null;
  release_year: number | null;
  language: string | null;
  tags: string[];
  pageviews: number | null;
  song_art_image_url: string | null;
  media: GeniusMedia[];
  writer_artists: GeniusArtistRef[];
  producer_artists: GeniusArtistRef[];
  featured_artists: GeniusArtistRef[];
  samples: GeniusRelatedSong[];
  sampled_in: GeniusRelatedSong[];
  interpolates: GeniusRelatedSong[];
  interpolated_by: GeniusRelatedSong[];
  cover_of: GeniusRelatedSong[];
  covered_by: GeniusRelatedSong[];
  remix_of: GeniusRelatedSong[];
  remixes: GeniusRelatedSong[];
  live_version_of: GeniusRelatedSong[];
}

function headers() {
  return { Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}` };
}

function toArtistRef(a: { name: string; url: string }): GeniusArtistRef {
  return { name: a.name, url: a.url };
}

function toRelated(s: { title: string; primary_artist: { name: string }; url: string }): GeniusRelatedSong {
  return { title: s.title, artist: s.primary_artist.name, genius_url: s.url };
}

function artistMatches(resultArtist: string, searchArtist: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]/g, '');
  const a = norm(resultArtist);
  const b = norm(searchArtist);
  if (a.length === 0 || b.length === 0) return false;
  return a.includes(b) || b.includes(a);
}

// Tags are server-rendered in the page HTML but not returned by the API (always null).
// Scrape them directly from the song page — no JS needed, no proxy required.
async function scrapeTags(lyricsUrl: string): Promise<string[]> {
  try {
    const res = await fetch(lyricsUrl, {
      headers: PAGE_HEADERS,
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/href="https:\/\/genius\.com\/tags\/[^"]+\"[^>]*>([^<]+)<\/a>/g)];
    return matches.map((m) => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  } catch {
    return [];
  }
}

type GeniusHit = { type: string; result: { id: number; url: string; primary_artist: { name: string } } };

async function geniusSearch(query: string): Promise<GeniusHit[]> {
  const q = encodeURIComponent(query);
  const res = await fetch(`${BASE}/search?q=${q}`, {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error(`[genius] search error ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { response: { hits: GeniusHit[] } };
  return data.response.hits ?? [];
}

function pickHit(hits: GeniusHit[], artist: string): GeniusHit | null {
  // Only actual lyrics pages (URLs end in "-lyrics")
  const lyricHits = hits.filter((h) => h.result.url.endsWith('-lyrics'));
  // Prefer artist match, then any lyrics page, then any hit as last resort
  return (
    lyricHits.find((h) => artistMatches(h.result.primary_artist.name, artist)) ??
    lyricHits[0] ??
    hits.find((h) => artistMatches(h.result.primary_artist.name, artist)) ??
    null
  );
}

export async function searchSong(title: string, artist: string): Promise<GeniusSong | null> {
  // Try "artist title", fall back to "title" alone if nothing found
  let hit = pickHit(await geniusSearch(`${artist} ${title}`), artist);
  if (!hit) hit = pickHit(await geniusSearch(title), artist);
  if (!hit) return null;

  const songId = hit.result.id;
  const songUrl = hit.result.url;

  // Fetch API details and scrape page tags in parallel
  const [songRes, tags] = await Promise.all([
    fetch(`${BASE}/songs/${songId}?text_format=plain`, {
      headers: headers(),
      signal: AbortSignal.timeout(8000),
    }),
    scrapeTags(songUrl),
  ]);

  if (!songRes.ok) return null;

  const songData = (await songRes.json()) as { response: { song: GeniusApiSong } };
  const s = songData.response.song;

  return {
    lyrics_url: s.url,
    title: s.title ?? '',
    artist: s.primary_artist?.name ?? '',
    description: s.description?.plain ?? null,
    release_date: s.release_date ?? null,
    release_year: s.release_date_components?.year ?? null,
    language: s.language ?? null,
    tags,
    pageviews: s.stats?.pageviews ?? null,
    song_art_image_url: s.song_art_image_url ?? null,
    media: (s.media ?? []).map((m) => ({ type: m.provider, url: m.url })),
    writer_artists: (s.writer_artists ?? []).map(toArtistRef),
    producer_artists: (s.producer_artists ?? []).map(toArtistRef),
    featured_artists: (s.featured_artists ?? []).map(toArtistRef),
    samples: (s.song_relationships?.find((r) => r.relationship_type === 'samples')?.songs ?? []).map(toRelated),
    sampled_in: (s.song_relationships?.find((r) => r.relationship_type === 'sampled_in')?.songs ?? []).map(toRelated),
    interpolates: (s.song_relationships?.find((r) => r.relationship_type === 'interpolates')?.songs ?? []).map(toRelated),
    interpolated_by: (s.song_relationships?.find((r) => r.relationship_type === 'interpolated_by')?.songs ?? []).map(toRelated),
    cover_of: (s.song_relationships?.find((r) => r.relationship_type === 'cover_of')?.songs ?? []).map(toRelated),
    covered_by: (s.song_relationships?.find((r) => r.relationship_type === 'covered_by')?.songs ?? []).map(toRelated),
    remix_of: (s.song_relationships?.find((r) => r.relationship_type === 'remix_of')?.songs ?? []).map(toRelated),
    remixes: (s.song_relationships?.find((r) => r.relationship_type === 'remixes')?.songs ?? []).map(toRelated),
    live_version_of: (s.song_relationships?.find((r) => r.relationship_type === 'live_version_of')?.songs ?? []).map(toRelated),
  };
}

interface GeniusApiSong {
  url: string;
  title?: string;
  primary_artist?: { name: string; url: string };
  description?: { plain: string };
  release_date?: string;
  release_date_components?: { year: number | null; month: number | null; day: number | null };
  language?: string;
  stats?: { pageviews: number };
  song_art_image_url?: string;
  media?: { provider: string; url: string }[];
  writer_artists?: { name: string; url: string }[];
  producer_artists?: { name: string; url: string }[];
  featured_artists?: { name: string; url: string }[];
  song_relationships?: {
    relationship_type: string;
    songs: { title: string; primary_artist: { name: string }; url: string }[];
  }[];
}
