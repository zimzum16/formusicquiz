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

  const res = await fetch(`${BASE}/?${params}`);
  const data = (await res.json()) as LastfmApiResponse;

  if (data.error || !data.track) return null;

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
