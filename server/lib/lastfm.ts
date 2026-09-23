const BASE = 'https://ws.audioscrobbler.com/2.0';

export interface LastfmTrack {
  listeners: number;
  playcount: number;
  url: string;
  tags: { name: string; url: string }[];
  similar: { title: string; artist: string; url: string }[];
}

export async function getTrackInfo(title: string, artist: string): Promise<LastfmTrack | null> {
  const key = process.env.LASTFM_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    method: 'track.getInfo',
    api_key: key,
    artist,
    track: title,
    autocorrect: '1',
    format: 'json',
  });

  let res: Response;
  try {
    res = await fetch(`${BASE}/?${params}`);
  } catch (e) {
    console.error('[lastfm] fetch failed:', e instanceof Error ? e.message : e);
    return null;
  }
  const data = (await res.json()) as LastfmApiResponse;

  if (data.error || !data.track) {
    if (data.error) console.error('[lastfm] API error:', data.error);
    return null;
  }

  const t = data.track;

  const tags = (t.toptags?.tag ?? [])
    .slice(0, 5)
    .map((tag) => ({ name: tag.name, url: tag.url }));

  const similar = (t.similartracks?.track ?? [])
    .slice(0, 5)
    .map((s) => ({ title: s.name, artist: s.artist.name, url: s.url }));

  return {
    listeners: Number(t.listeners),
    playcount: Number(t.playcount),
    url: t.url,
    tags,
    similar,
  };
}

export interface LastfmSimilarArtist {
  name: string;
  url: string;
  image_url: string | null;
}

export async function getSimilarArtists(artistName: string, limit = 10): Promise<LastfmSimilarArtist[]> {
  const key = process.env.LASTFM_API_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    method: 'artist.getSimilar',
    api_key: key,
    artist: artistName,
    limit: String(limit),
    autocorrect: '1',
    format: 'json',
  });

  try {
    const res = await fetch(`${BASE}/?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = (await res.json()) as LastfmSimilarResponse;
    if (data.error || !data.similarartists?.artist) return [];
    const artists = Array.isArray(data.similarartists.artist)
      ? data.similarartists.artist
      : [data.similarartists.artist];
    return artists.map(a => {
      const imgEntry = a.image?.find(i => i.size === 'extralarge' || i.size === 'mega') ?? a.image?.[a.image.length - 1];
      const img = imgEntry?.['#text'] ?? null;
      return {
        name: a.name,
        url: a.url,
        image_url: img && !img.includes('2a96cbd8b46e442fc41c2b86b821562f') ? img : null,
      };
    });
  } catch {
    return [];
  }
}

interface LastfmApiResponse {
  error?: number;
  track?: {
    listeners: string;
    playcount: string;
    url: string;
    toptags?: { tag: { name: string; url: string }[] };
    similartracks?: { track: { name: string; url: string; artist: { name: string } }[] };
  };
}

interface LastfmSimilarResponse {
  error?: number;
  similarartists?: {
    artist: Array<{
      name: string;
      url: string;
      image?: Array<{ '#text': string; size: string }>;
    }> | {
      name: string;
      url: string;
      image?: Array<{ '#text': string; size: string }>;
    };
  };
}
