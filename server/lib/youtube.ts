const BASE = 'https://www.googleapis.com/youtube/v3';

export interface YoutubeResult {
  video_id: string | null;
  url: string;
  search_url: string;
  view_count: number | null;
  like_count: number | null;
}

interface SearchItem {
  id: { videoId: string };
  snippet: { channelTitle: string };
}

async function searchVideos(q: string, maxResults: number, key: string): Promise<SearchItem[]> {
  const params = new URLSearchParams({ part: 'snippet', q, type: 'video', maxResults: String(maxResults), key });
  const res = await fetch(`${BASE}/search?${params}`);
  const data = (await res.json()) as { items?: SearchItem[] };
  return data.items ?? [];
}

async function fetchStats(videoId: string, key: string) {
  const params = new URLSearchParams({ part: 'statistics', id: videoId, key });
  const res = await fetch(`${BASE}/videos?${params}`);
  const data = (await res.json()) as { items?: { statistics: { viewCount: string; likeCount: string } }[] };
  return data.items?.[0]?.statistics ?? null;
}

function artistMatch(channelTitle: string, artist: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ch = normalize(channelTitle);
  const ar = normalize(artist);
  return ch.includes(ar) || ar.includes(ch);
}

export async function findVideo(title: string, artist: string): Promise<YoutubeResult> {
  const search_url = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title} official`)}`;

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { video_id: null, url: search_url, search_url, view_count: null, like_count: null };
  }

  // Fetch top 5 results for "official video", then "official audio" as fallback
  let items = await searchVideos(`${artist} ${title} official video`, 5, key);
  if (items.length === 0) {
    items = await searchVideos(`${artist} ${title} official audio`, 5, key);
  }

  if (items.length === 0) {
    return { video_id: null, url: search_url, search_url, view_count: null, like_count: null };
  }

  // Prefer a result from the artist's own channel
  const official = items.find(item => artistMatch(item.snippet.channelTitle, artist));
  const best = official ?? items[0];
  const videoId = best.id.videoId;

  const stats = await fetchStats(videoId, key);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    video_id: videoId,
    url,
    search_url,
    view_count: stats ? Number(stats.viewCount) : null,
    like_count: stats ? Number(stats.likeCount) : null,
  };
}
