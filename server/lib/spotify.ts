const BASE = 'https://api.spotify.com/v1';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAppToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[spotify] token error ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return tokenCache.token;
  } catch (e) {
    console.error('[spotify] token fetch failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  artist_id: string;
  album: string;
  release_date: string;
  duration_ms: number;
  preview_url: string | null;
  cover_url: string | null;
  spotify_url: string;
  popularity: number | null;
}

export interface SpotifyArtist {
  followers: number;
  genres: string[];
}

export interface ArtistAlbum {
  id: string;
  title: string;
  year: string;
  cover_url: string | null;
  track_count: number;
}

export interface SpotifyArtistResult {
  id: string;
  name: string;
  popularity: number;
  followers: number;
  genres: string[];
  image_url: string | null;
  spotify_url: string;
}

interface SpotifyApiArtist {
  id: string;
  name: string;
  popularity?: number;
  followers?: { total?: number };
  genres?: string[];
  images?: { url: string; width: number; height: number }[];
  external_urls?: { spotify: string };
}

export async function searchArtists(query: string): Promise<SpotifyArtistResult[]> {
  const token = await getAppToken();
  if (!token) return [];
  const searchUrl = `${BASE}/search?q=${encodeURIComponent(query)}&type=artist&limit=5&market=US`;
  const res = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { artists: { items: SpotifyApiArtist[] } };
  const items = data.artists.items;
  if (!items.length) return [];

  return items.map(a => ({
    id: a.id,
    name: a.name,
    popularity: a.popularity ?? 0,
    followers: a.followers?.total ?? 0,
    genres: a.genres ?? [],
    image_url: a.images?.[0]?.url ?? null,
    spotify_url: a.external_urls?.spotify ?? '',
  }));
}

export async function searchTracks(query: string, artist?: string): Promise<SpotifyTrack[]> {
  const token = await getAppToken();
  if (!token) return [];
  const q = artist ? `track:${query} artist:${artist}` : query;
  const url = `${BASE}/search?q=${encodeURIComponent(q)}&type=track&limit=10&market=US`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[spotify] search error ${res.status}:`, text.slice(0, 200));
    return [];
  }
  const data = (await res.json()) as { tracks: { items: SpotifyApiTrack[] } };

  return data.tracks.items.map(normalizeTrack);
}

export async function getTrack(id: string): Promise<SpotifyTrack | null> {
  const token = await getAppToken();
  if (!token) return null;
  const res = await fetch(`${BASE}/tracks/${id}?market=US`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as SpotifyApiTrack;
  return normalizeTrack(data);
}

interface SpotifyApiTrack {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: { name: string; release_date: string; images: { url: string }[] };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  popularity?: number;
}

interface SpotifyAlbumItem {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  album_type?: string;
  album_group?: string;
  images?: { url: string }[];
}

async function fetchArtistAlbumGroup(token: string, artistId: string, group: string): Promise<SpotifyAlbumItem[]> {
  const items: SpotifyAlbumItem[] = [];
  let url: string | null =
    `${BASE}/artists/${artistId}/albums?include_groups=${encodeURIComponent(group)}&market=US&limit=20`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) break;
    const data = (await res.json()) as { items: SpotifyAlbumItem[]; next: string | null; total: number };
    items.push(...data.items);
    url = data.next;
    if (items.length >= 100) break;
  }
  return items;
}

export async function getArtistAlbums(artistId: string): Promise<ArtistAlbum[]> {
  const token = await getAppToken();
  if (!token) return [];

  // Fetch albums/EPs and singles separately so full albums come first
  const [albums, singles] = await Promise.all([
    fetchArtistAlbumGroup(token, artistId, 'album').catch(() => [] as SpotifyAlbumItem[]),
    fetchArtistAlbumGroup(token, artistId, 'single').catch(() => [] as SpotifyAlbumItem[]),
  ]);

  const seen = new Set<string>();
  const dedup = (a: SpotifyAlbumItem) => {
    // Filter out compilations appearing in artist page as a foreign album
    if (a.album_group === 'appears_on' || a.album_group === 'compilation') return false;
    const key = a.name.toLowerCase().replace(/\s*[-–—]\s*(single|ep|remix|remixes|live|version|edition|remastered|deluxe|extended).*$/i, '').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  return [...albums.filter(dedup), ...singles.filter(dedup)]
    .sort((a, b) => b.release_date.localeCompare(a.release_date))
    .map(a => ({
      id: `spotify:album:${a.id}`,
      title: a.name,
      year: a.release_date?.slice(0, 4) ?? '',
      cover_url: a.images?.[0]?.url ?? null,
      track_count: a.total_tracks,
    }));
}

export async function getAlbumTracks(spotifyAlbumId: string): Promise<SpotifyTrack[]> {
  const token = await getAppToken();
  if (!token) return [];
  // Fetch album (includes tracks + cover image)
  const albumRes = await fetch(`${BASE}/albums/${spotifyAlbumId}?market=US`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!albumRes.ok) return [];
  const album = (await albumRes.json()) as {
    name: string;
    images?: { url: string }[];
    tracks: {
      items: Array<{
        id: string;
        name: string;
        artists: { name: string; id: string }[];
        duration_ms: number;
        preview_url: string | null;
        track_number: number;
        external_urls: { spotify: string };
      }>;
    };
    release_date: string;
  };
  const cover = album.images?.[0]?.url ?? null;
  return album.tracks.items
    .sort((a, b) => a.track_number - b.track_number)
    .map(t => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      artist_id: t.artists[0]?.id ?? '',
      album: album.name,
      release_date: album.release_date,
      duration_ms: t.duration_ms,
      preview_url: t.preview_url,
      cover_url: cover,
      spotify_url: t.external_urls.spotify,
      popularity: null,
    }));
}

function normalizeTrack(t: SpotifyApiTrack): SpotifyTrack {
  return {
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    artist_id: t.artists[0]?.id ?? '',
    album: t.album.name,
    release_date: t.album.release_date,
    duration_ms: t.duration_ms,
    preview_url: t.preview_url ?? null,
    cover_url: t.album.images[0]?.url ?? null,
    spotify_url: t.external_urls.spotify,
    popularity: t.popularity ?? null,
  };
}

