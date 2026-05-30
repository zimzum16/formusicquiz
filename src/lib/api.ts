import type { paths } from './api-types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Типы из автогенерированного spec — не редактировать вручную, запустить npm run gen:types
export type User = NonNullable<
  paths['/api/auth/me']['get']['responses']['200']['content']['application/json']['user']
>;
export type AuthResponse =
  paths['/api/auth/login']['post']['responses']['200']['content']['application/json'];

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const { headers: extraHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

// Tracks types
export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
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
  language: string | null;
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
  encore_count: number;
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

export interface TrackInfo {
  spotify: SpotifyTrack;
  genius: GeniusSong | null;
  lastfm: LastfmTrack | null;
  setlistfm: SetlistStats | null;
  youtube: YoutubeResult;
  yandex: { search_url: string };
}

export const tracksApi = {
  search: (q: string, artist?: string) => {
    const params = new URLSearchParams({ q });
    if (artist) params.set('artist', artist);
    return request<SpotifyTrack[]>(`/api/tracks/search?${params}`);
  },
  getInfo: (id: string) => request<TrackInfo>(`/api/tracks/${id}/info`),
};

export const authApi = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User | null }>('/api/auth/me'),
};
