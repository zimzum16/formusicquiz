import type { paths } from './api-types';

const BASE = import.meta.env.VITE_API_URL ?? '';

const PROXY_HOSTS = ['i.scdn.co', 'mosaic.scdn.co', 'lineup-images.scdn.co', 'is1-ssl.mzstatic.com', 'is2-ssl.mzstatic.com', 'is3-ssl.mzstatic.com', 'is4-ssl.mzstatic.com', 'is5-ssl.mzstatic.com'];
export function proxyImg(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    if (PROXY_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
      return `${BASE}/api/img?url=${encodeURIComponent(url)}`;
    }
  } catch { /* ignore */ }
  return url;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: extraHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

// Типы ответов — из OpenAPI-спецификации бэкенда (src/lib/api-types.ts, `npm run gen:types`).
// Руками не дублируем: при изменении zod-схемы на сервере перегенерировать
type Json<P extends keyof paths> = paths[P]['get']['responses'][200]['content']['application/json'];

export type SearchResults = Json<'/api/tracks/search'>;
export type SpotifyArtistResult = SearchResults['artists'][number];
export type SpotifyTrack = SearchResults['tracks'][number];
export type ArtistAlbum = Json<'/api/tracks/artists/:id/albums'>[number];
export type TrackInfo = Json<'/api/tracks/:id/info'>;
export type SetlistStats = Json<'/api/tracks/:id/setlistfm'>;

export async function searchItunesDirect(title: string, artist?: string): Promise<SpotifyTrack[]> {
  const term = artist ? `${title} ${artist}` : title;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=10&country=US`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return [];
    const data = await res.json() as { results: Array<{
      kind?: string; trackId: number; trackName: string; artistName: string;
      artistId?: number; collectionName: string; releaseDate: string;
      trackTimeMillis: number; previewUrl?: string; artworkUrl100?: string; trackViewUrl: string;
    }> };
    return data.results
      .filter(r => r.kind === 'song')
      .map(r => ({
        id: `itunes:${r.trackId}`,
        title: r.trackName,
        artist: r.artistName,
        artist_id: String(r.artistId ?? ''),
        album: r.collectionName ?? '',
        release_date: r.releaseDate ? r.releaseDate.split('T')[0] : '',
        duration_ms: r.trackTimeMillis ?? 0,
        preview_url: r.previewUrl ?? null,
        cover_url: r.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null,
        spotify_url: r.trackViewUrl ?? '',
        popularity: null,
      }));
  } catch {
    return [];
  }
}

export type ArtistInfo = NonNullable<Json<'/api/info/artist/:id'>>;
export type AlbumInfo = NonNullable<Json<'/api/info/album/:id'>>;
export type TrackWikiInfo = NonNullable<Json<'/api/info/track/:id'>>;
export type Localized = ArtistInfo['name'];
export type WikiPage = NonNullable<ArtistInfo['wikipedia']['en']>;
export type BandMember = ArtistInfo['members'][number];

// Справка грузится несколько секунд, поэтому её предзагружают заранее (наведение, первый артист
// в поиске) — повторный вызов с тем же путём получает уже идущий или готовый запрос
const infoRequests = new Map<string, Promise<unknown>>();
const infoResolved = new Map<string, unknown>();

function cachedInfo<T>(path: string, fresh = false): Promise<T> {
  if (fresh) { infoRequests.delete(path); infoResolved.delete(path); }
  let p = infoRequests.get(path) as Promise<T> | undefined;
  if (!p) {
    p = request<T>(path);
    infoRequests.set(path, p);
    p.then(v => infoResolved.set(path, v), () => infoRequests.delete(path));
  }
  return p;
}

const artistInfoPath = (id: string, name: string) =>
  `/api/info/artist/${encodeURIComponent(id)}?${new URLSearchParams({ name })}`;

const trackInfoPath = (id: string, title: string, artist: string) =>
  `/api/info/track/${encodeURIComponent(id)}?${new URLSearchParams({ title, artist })}`;

const albumInfoPath = (id: string, title: string, artist?: string) => {
  const params = new URLSearchParams({ title });
  if (artist) params.set('artist', artist);
  return `/api/info/album/${encodeURIComponent(id)}?${params}`;
};

export const infoApi = {
  getArtist: (id: string, name: string, fresh = false) =>
    cachedInfo<ArtistInfo | null>(artistInfoPath(id, name), fresh),
  getAlbum: (id: string, title: string, artist?: string, fresh = false) =>
    cachedInfo<AlbumInfo | null>(albumInfoPath(id, title, artist), fresh),
  getTrack: (id: string, title: string, artist: string, fresh = false) =>
    cachedInfo<TrackWikiInfo | null>(trackInfoPath(id, title, artist), fresh),
  peekTrack: (id: string, title: string, artist: string) =>
    infoResolved.get(trackInfoPath(id, title, artist)) as TrackWikiInfo | null | undefined,
  // Уже загруженное — синхронно, чтобы панель не мигала заглушкой
  peekArtist: (id: string, name: string) => infoResolved.get(artistInfoPath(id, name)) as ArtistInfo | null | undefined,
  peekAlbum: (id: string, title: string, artist?: string) => infoResolved.get(albumInfoPath(id, title, artist)) as AlbumInfo | null | undefined,
  prefetchArtist: (id: string, name: string) => { cachedInfo(artistInfoPath(id, name)).catch(() => {}); },
  prefetchAlbum: (id: string, title: string, artist?: string) => { cachedInfo(albumInfoPath(id, title, artist)).catch(() => {}); },
};

export const tracksApi = {
  search: (q: string, artist?: string) => {
    const params = new URLSearchParams({ q });
    if (artist) params.set('artist', artist);
    return request<SearchResults>(`/api/tracks/search?${params}`);
  },
  getInfo: (id: string) => request<TrackInfo>(`/api/tracks/${id}/info`),
  getSetlistfm: (id: string) => request<SetlistStats | null>(`/api/tracks/${id}/setlistfm`),
  getArtistAlbums: (id: string, name: string) => {
    const params = new URLSearchParams({ name });
    return request<ArtistAlbum[]>(`/api/tracks/artists/${id}/albums?${params}`);
  },
  getAlbumTracks: (id: string) => request<SpotifyTrack[]>(`/api/tracks/albums/${encodeURIComponent(id)}/tracks`),
  getRelatedArtists: (id: string, name?: string) => {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    return request<SpotifyArtistResult[]>(`/api/tracks/artists/${encodeURIComponent(id)}/related${params}`);
  },
};

