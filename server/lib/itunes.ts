import type { SpotifyTrack, SpotifyArtistResult, ArtistAlbum } from './spotify.js';

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

export async function searchArtistsItunes(query: string): Promise<SpotifyArtistResult[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=5&country=US`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results: Array<{
        wrapperType: string;
        artistId: number;
        artistName: string;
        artistLinkUrl?: string;
        primaryGenreName?: string;
      }>;
    };
    return data.results
      .filter(r => r.wrapperType === 'artist')
      .map(a => ({
        id: `itunes:artist:${a.artistId}`,
        name: a.artistName,
        popularity: 0,
        followers: 0,
        genres: a.primaryGenreName ? [a.primaryGenreName] : [],
        image_url: null,
        spotify_url: a.artistLinkUrl ?? '',
      }));
  } catch {
    return [];
  }
}

export async function getArtistAlbumsItunes(artistId: string, artistName: string): Promise<ArtistAlbum[]> {
  try {
    type AlbumResult = {
      wrapperType: string;
      collectionId: number;
      collectionName: string;
      releaseDate?: string;
      trackCount?: number;
      artworkUrl100?: string;
      artistName: string;
    };

    // If we already have an iTunes artist ID, skip lookup step
    let numericId = artistId.startsWith('itunes:artist:') ? artistId.slice('itunes:artist:'.length) : null;

    // For Spotify IDs, resolve iTunes artist ID first via artist search
    if (!numericId) {
      const artistRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1&country=US`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (artistRes.ok) {
        const artistData = (await artistRes.json()) as { results: Array<{ wrapperType: string; artistId: number }> };
        const found = artistData.results.find(r => r.wrapperType === 'artist');
        if (found) numericId = String(found.artistId);
      }
    }

    const url = numericId
      ? `https://itunes.apple.com/lookup?id=${numericId}&entity=album&limit=50&country=US`
      : `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&limit=25&country=US`;

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { results: AlbumResult[] };

    const seen = new Set<string>();
    return data.results
      .filter(r => r.wrapperType === 'collection')
      .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
      .filter(r => { const key = r.collectionName.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
      .map(r => ({
        id: `itunes:album:${r.collectionId}`,
        title: r.collectionName,
        year: r.releaseDate?.slice(0, 4) ?? '',
        cover_url: r.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null,
        track_count: r.trackCount ?? 0,
      }));
  } catch {
    return [];
  }
}

export async function getAlbumTracksItunes(albumId: string): Promise<SpotifyTrack[]> {
  const numericId = albumId.replace('itunes:album:', '');
  try {
    const url = `https://itunes.apple.com/lookup?id=${numericId}&entity=song&limit=50&country=US`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { results: Array<iTunesResult & { wrapperType?: string; discNumber?: number; trackNumber?: number }> };
    // First result is the album itself (wrapperType=collection), rest are songs
    const albumMeta = data.results[0];
    const albumCover = albumMeta?.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null;
    return data.results
      .filter(r => r.kind === 'song')
      .sort((a, b) => ((a as { trackNumber?: number }).trackNumber ?? 0) - ((b as { trackNumber?: number }).trackNumber ?? 0))
      .map(t => ({
        id: `itunes:${t.trackId}`,
        title: t.trackName,
        artist: t.artistName,
        artist_id: String(t.artistId ?? ''),
        album: t.collectionName ?? '',
        release_date: t.releaseDate ? t.releaseDate.split('T')[0] : '',
        duration_ms: t.trackTimeMillis ?? 0,
        preview_url: t.previewUrl ?? null,
        cover_url: albumCover,
        spotify_url: t.trackViewUrl ?? '',
        popularity: null,
      }));
  } catch {
    return [];
  }
}

export async function searchTracksItunes(query: string, artist?: string, limit = 10): Promise<SpotifyTrack[]> {
  const term = artist ? `${query} ${artist}` : query;

  const fetchCountry = async (country: string): Promise<SpotifyTrack[]> => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}&country=${country}`;
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
