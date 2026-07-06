import type { SpotifyTrack } from './spotify.js';

interface iTunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artistId?: number;
  collectionName: string;
  releaseDate: string;
  trackTimeMillis: number;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl: string;
  kind?: string;
}

interface iTunesResponse {
  resultCount: number;
  results: iTunesResult[];
}

function normalize(t: iTunesResult): SpotifyTrack {
  return {
    id: `itunes:${t.trackId}`,
    title: t.trackName,
    artist: t.artistName,
    artist_id: String(t.artistId ?? ''),
    album: t.collectionName ?? '',
    release_date: t.releaseDate ? t.releaseDate.split('T')[0] : '',
    duration_ms: t.trackTimeMillis ?? 0,
    preview_url: t.previewUrl ?? null,
    cover_url: t.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null,
    spotify_url: t.trackViewUrl ?? '',
    popularity: null,
  };
}

export async function getTrackItunes(itunesId: string): Promise<SpotifyTrack | null> {
  const numericId = itunesId.replace('itunes:', '');
  const url = `https://itunes.apple.com/lookup?id=${numericId}&entity=song`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as iTunesResponse;
    const t = data.results.find(r => r.kind === 'song');
    return t ? normalize(t) : null;
  } catch (e) {
    console.error('[itunes] getTrack failed:', e);
    return null;
  }
}

export async function searchTracksItunes(query: string, artist?: string): Promise<SpotifyTrack[]> {
  const term = artist ? `${query} ${artist}` : query;

  const fetchCountry = async (country: string): Promise<SpotifyTrack[]> => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=10&country=${country}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) { console.error(`[itunes] search error ${res.status} (${country})`); return []; }
      const data = (await res.json()) as iTunesResponse;
      return data.results.filter(r => r.kind === 'song').map(normalize);
    } catch (e) {
      console.error(`[itunes] search failed (${country}):`, e);
      return [];
    }
  };

  const usResults = await fetchCountry('US');
  if (usResults.length > 0) return usResults;
  return fetchCountry('RU');
}
