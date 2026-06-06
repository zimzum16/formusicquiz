const BASE = 'https://api.spotify.com/v1';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAppToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return tokenCache.token;
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

export async function searchTracks(query: string, artist?: string): Promise<SpotifyTrack[]> {
  const token = await getAppToken();
  const q = artist ? `track:${query} artist:${artist}` : query;
  const url = `${BASE}/search?q=${encodeURIComponent(q)}&type=track&limit=10&market=US`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json()) as { tracks: { items: SpotifyApiTrack[] } };

  return data.tracks.items.map(normalizeTrack);
}

export async function getTrack(id: string): Promise<SpotifyTrack | null> {
  const token = await getAppToken();
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

function normalizeTrack(t: SpotifyApiTrack): SpotifyTrack {
  return {
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    artist_id: t.artists[0]?.id ?? '',
    album: t.album.name,
    release_date: t.album.release_date,
    duration_ms: t.duration_ms,
    preview_url: t.preview_url,
    cover_url: t.album.images[0]?.url ?? null,
    spotify_url: t.external_urls.spotify,
    popularity: t.popularity ?? null,
  };
}

