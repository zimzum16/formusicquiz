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

// Tracks types
export interface SpotifyArtistResult {
  id: string;
  name: string;
  popularity: number;
  followers: number;
  genres: string[];
  image_url: string | null;
  spotify_url: string;
}

export interface SearchResults {
  artists: SpotifyArtistResult[];
  tracks: SpotifyTrack[];
}

export interface ArtistAlbum {
  id: string;
  title: string;
  year: string;
  cover_url: string | null;
  track_count: number;
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


export interface ArtistRef { name: string; url: string }
export interface RelatedSong { title: string; artist: string; genius_url: string }
export interface GeniusMedia { type: string; url: string }

export interface GeniusSong {
  lyrics_url: string;
  description: string | null;
  release_date: string | null;
  release_year: number | null;
  language: string | null;
  tags: string[];
  pageviews: number | null;
  song_art_image_url: string | null;
  media: GeniusMedia[];
  writer_artists: ArtistRef[];
  producer_artists: ArtistRef[];
  featured_artists: ArtistRef[];
  samples: RelatedSong[];
  sampled_in: RelatedSong[];
  interpolates: RelatedSong[];
  interpolated_by: RelatedSong[];
  cover_of: RelatedSong[];
  covered_by: RelatedSong[];
  remix_of: RelatedSong[];
  remixes: RelatedSong[];
  live_version_of: RelatedSong[];
}

export interface LastfmTrack {
  listeners: number;
  playcount: number;
  url: string;
  tags: { name: string; url: string }[];
  similar: { title: string; artist: string; url: string }[];
}

export interface Performance {
  date: string;
  venue: string;
  city: string;
  tour: string | null;
}

export interface SetlistStats {
  total_performances: number;
  url: string;
  first_performance: Performance | null;
  last_performance: Performance | null;
}

export interface YoutubeResult {
  video_id: string | null;
  url: string;
  search_url: string;
  view_count: number | null;
  like_count: number | null;
}

export interface YandexResult {
  url: string | null;
  search_url: string;
  play_count: number | null;
  chart: { position: number; progress: 'up' | 'down' | 'same' } | null;
}

export interface AppleMusicResult {
  search_url: string;
  charts: { position: number; country: string }[];
}

export interface TrackInfo {
  spotify: SpotifyTrack;

  genius: GeniusSong | null;
  lastfm: LastfmTrack | null;
  youtube: YoutubeResult;
  yandex: YandexResult;
  apple_music: AppleMusicResult;
}

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

// Info types (Wikidata / Wikipedia / MusicBrainz)
export interface Localized { ru: string | null; en: string | null }

export interface WikiPage {
  title: string;
  url: string;
  description: string | null;
  extract: string | null;
  image: string | null;
}

export interface BandMember {
  name: string;
  periods: { begin: string | null; end: string | null }[];
  roles: string[];
}

export interface ArtistInfo {
  wikidata_id: string;
  name: Localized;
  wikipedia: { ru: WikiPage | null; en: WikiPage | null };
  founded: string | null;
  dissolved: string | null;
  country: Localized | null;
  genres: Localized[];
  members: BandMember[];
  rym_url: string | null;
  musicbrainz_id: string | null;
  pending: boolean;
}

export interface AlbumInfo {
  wikidata_id: string;
  title: Localized;
  wikipedia: { ru: WikiPage | null; en: WikiPage | null };
  released: string | null;
  labels: Localized[];
  producers: Localized[];
  genres: Localized[];
  critic_ratings: { source: string; score: string }[];
  community_rating: { value: number; votes: number } | null;
  rym_url: string;
  musicbrainz_id: string | null;
  pending: boolean;
}

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

