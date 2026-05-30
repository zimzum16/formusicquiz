const BASE = 'https://api.genius.com';

interface GeniusArtistRef {
  name: string;
  url: string;
}

interface GeniusRelatedSong {
  title: string;
  artist: string;
  genius_url: string;
}

interface GeniusMedia {
  type: string;
  url: string;
}

export interface GeniusSong {
  lyrics_url: string;
  description: string | null;
  release_date: string | null;
  language: string | null;
  pageviews: number | null;
  song_art_image_url: string | null;
  media: GeniusMedia[];
  writer_artists: GeniusArtistRef[];
  producer_artists: GeniusArtistRef[];
  featured_artists: GeniusArtistRef[];
  samples: GeniusRelatedSong[];
  sampled_in: GeniusRelatedSong[];
  interpolates: GeniusRelatedSong[];
  interpolated_by: GeniusRelatedSong[];
  cover_of: GeniusRelatedSong[];
  covered_by: GeniusRelatedSong[];
  remix_of: GeniusRelatedSong[];
  remixes: GeniusRelatedSong[];
  live_version_of: GeniusRelatedSong[];
}

function headers() {
  return { Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}` };
}

function toArtistRef(a: { name: string; url: string }): GeniusArtistRef {
  return { name: a.name, url: a.url };
}

function toRelated(s: { title: string; primary_artist: { name: string }; url: string }): GeniusRelatedSong {
  return { title: s.title, artist: s.primary_artist.name, genius_url: s.url };
}

export async function searchSong(title: string, artist: string): Promise<GeniusSong | null> {
  const q = encodeURIComponent(`${artist} ${title}`);
  const searchRes = await fetch(`${BASE}/search?q=${q}`, { headers: headers() });
  const searchData = (await searchRes.json()) as {
    response: { hits: { result: { id: number } }[] };
  };

  const hit = searchData.response.hits[0];
  if (!hit) return null;

  const songId = hit.result.id;
  const songRes = await fetch(`${BASE}/songs/${songId}?text_format=plain`, { headers: headers() });
  if (!songRes.ok) return null;

  const songData = (await songRes.json()) as { response: { song: GeniusApiSong } };
  const s = songData.response.song;

  return {
    lyrics_url: s.url,
    description: s.description?.plain ?? null,
    release_date: s.release_date ?? null,
    language: s.language ?? null,
    pageviews: s.stats?.pageviews ?? null,
    song_art_image_url: s.song_art_image_url ?? null,
    media: (s.media ?? []).map((m) => ({ type: m.provider, url: m.url })),
    writer_artists: (s.writer_artists ?? []).map(toArtistRef),
    producer_artists: (s.producer_artists ?? []).map(toArtistRef),
    featured_artists: (s.featured_artists ?? []).map(toArtistRef),
    samples: (s.song_relationships?.find((r) => r.relationship_type === 'samples')?.songs ?? []).map(toRelated),
    sampled_in: (s.song_relationships?.find((r) => r.relationship_type === 'sampled_in')?.songs ?? []).map(toRelated),
    interpolates: (s.song_relationships?.find((r) => r.relationship_type === 'interpolates')?.songs ?? []).map(toRelated),
    interpolated_by: (s.song_relationships?.find((r) => r.relationship_type === 'interpolated_by')?.songs ?? []).map(toRelated),
    cover_of: (s.song_relationships?.find((r) => r.relationship_type === 'cover_of')?.songs ?? []).map(toRelated),
    covered_by: (s.song_relationships?.find((r) => r.relationship_type === 'covered_by')?.songs ?? []).map(toRelated),
    remix_of: (s.song_relationships?.find((r) => r.relationship_type === 'remix_of')?.songs ?? []).map(toRelated),
    remixes: (s.song_relationships?.find((r) => r.relationship_type === 'remixes')?.songs ?? []).map(toRelated),
    live_version_of: (s.song_relationships?.find((r) => r.relationship_type === 'live_version_of')?.songs ?? []).map(toRelated),
  };
}

interface GeniusApiSong {
  url: string;
  description?: { plain: string };
  release_date?: string;
  language?: string;
  stats?: { pageviews: number };
  song_art_image_url?: string;
  media?: { provider: string; url: string }[];
  writer_artists?: { name: string; url: string }[];
  producer_artists?: { name: string; url: string }[];
  featured_artists?: { name: string; url: string }[];
  song_relationships?: {
    relationship_type: string;
    songs: { title: string; primary_artist: { name: string }; url: string }[];
  }[];
}
