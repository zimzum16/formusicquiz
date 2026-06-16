const BASE = import.meta.env.VITE_API_URL ?? '';

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
  likes_count: number | null;
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

export const tracksApi = {
  search: (q: string, artist?: string) => {
    const params = new URLSearchParams({ q });
    if (artist) params.set('artist', artist);
    return request<SpotifyTrack[]>(`/api/tracks/search?${params}`);
  },
  getInfo: (id: string) => request<TrackInfo>(`/api/tracks/${id}/info`),
  getSetlistfm: (id: string) => request<SetlistStats | null>(`/api/tracks/${id}/setlistfm`),
};

