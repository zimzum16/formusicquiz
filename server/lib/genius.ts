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

async function scrapeTags(lyricsUrl: string): Promise<string[]> {
  const decode = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  const fetchHtml = async (): Promise<string> => {
    // Try direct first — free, works when VPS IP isn't blocked
    try {
      const res = await fetch(lyricsUrl, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(10000) });
      console.log('[genius] scrapeTags direct status:', res.status);
      if (res.ok) return res.text();
    } catch { /* blocked, fall through to proxy */ }

    // ScraperAPI keys — sequential (keys have separate quotas)
    const scraperKeys = [
      ...(process.env.SCRAPERAPI_KEYS ?? '').split(',').map(k => k.trim()).filter(Boolean),
      ...(process.env.SCRAPERAPI_KEY ? [process.env.SCRAPERAPI_KEY] : []),
    ];
    for (const key of scraperKeys) {
      try {
        const res = await fetch(`http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(lyricsUrl)}`, { signal: AbortSignal.timeout(9000) });
        console.log('[genius] scrapeTags scraperapi status:', res.status);
        if (res.ok) return res.text();
      } catch { /* try next */ }
    }

    // ZenRows keys — parallel: whichever responds first wins, failed key is skipped
    const zenrowsKeys = (process.env.ZENROWS_KEYS ?? '').split(',').map(k => k.trim()).filter(Boolean);
    if (zenrowsKeys.length > 0) {
      try {
        const html = await Promise.any(
          zenrowsKeys.map(key =>
            fetch(`https://api.zenrows.com/v1/?apikey=${key}&url=${encodeURIComponent(lyricsUrl)}&antibot=true`, { signal: AbortSignal.timeout(9000) })
              .then(res => {
                console.log('[genius] scrapeTags zenrows status:', res.status, `(key ...${key.slice(-6)})`);
                if (!res.ok) return Promise.reject(new Error(`zenrows ${res.status}`));
                return res.text();
              })
          )
        );
        if (html) return html;
      } catch { /* all ZenRows keys failed */ }
    }
    return '';
  };

  try {
    const html = await fetchHtml();
    if (!html) return [];

    // Pattern 1: anchor tags rendered server-side
    const anchorMatches = [...html.matchAll(/href="https:\/\/genius\.com\/tags\/[^"]+\"[^>]*>([^<]+)<\/a>/g)];
    if (anchorMatches.length > 0) return anchorMatches.map((m) => decode(m[1]));

    // Pattern 2: __NEXT_DATA__ JSON (Next.js Genius pages)
    const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const json = JSON.parse(nextDataMatch[1]);
        const song = json?.props?.pageProps?.songPage?.song ?? json?.props?.pageProps?.song;
        if (Array.isArray(song?.tags) && song.tags.length > 0) {
          return (song.tags as Array<{ name: string }>).map(t => t.name).filter(Boolean);
        }
      } catch { /* ignore */ }
    }

    // Pattern 3: legacy embedded JSON
    const jsonMatches = [...html.matchAll(/"url":"https:\/\/genius\.com\/tags\/[^"]+","primary":[^,]+,"name":"([^"]+)"/g)];
    console.log('[genius] scrapeTags patterns matched: anchor=0 nextData=0 legacy=' + jsonMatches.length);
    return jsonMatches.map((m) => decode(m[1]));
  } catch (e) {
    console.error('[genius] scrapeTags error:', e);
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
    Promise.race([
      scrapeTags(songUrl),
      new Promise<string[]>(resolve => setTimeout(() => resolve([]), 10000)),
    ]),
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
    tags: (s.tags && s.tags.length > 0) ? s.tags.map(t => t.name) : tags,
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
  tags?: Array<{ id: number; name: string }>;
  song_relationships?: {
    relationship_type: string;
    songs: { title: string; primary_artist: { name: string }; url: string }[];
  }[];
}
