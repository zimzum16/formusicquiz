const BASE = 'https://www.googleapis.com/youtube/v3';

export interface YoutubeResult {
  video_id: string | null;
  url: string;
  search_url: string;
  view_count: number | null;
  like_count: number | null;
}

export async function findVideo(title: string, artist: string): Promise<YoutubeResult> {
  const query = `${artist} ${title} official`;
  const search_url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { video_id: null, url: search_url, search_url, view_count: null, like_count: null };
  }

  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '1',
    key,
  });

  const searchRes = await fetch(`${BASE}/search?${searchParams}`);
  const searchData = (await searchRes.json()) as {
    items?: { id: { videoId: string } }[];
  };

  const videoId = searchData.items?.[0]?.id?.videoId;
  if (!videoId) {
    return { video_id: null, url: search_url, search_url, view_count: null, like_count: null };
  }

  const statsParams = new URLSearchParams({
    part: 'statistics',
    id: videoId,
    key,
  });

  const statsRes = await fetch(`${BASE}/videos?${statsParams}`);
  const statsData = (await statsRes.json()) as {
    items?: { statistics: { viewCount: string; likeCount: string } }[];
  };

  const stats = statsData.items?.[0]?.statistics;
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    video_id: videoId,
    url,
    search_url,
    view_count: stats ? Number(stats.viewCount) : null,
    like_count: stats ? Number(stats.likeCount) : null,
  };
}
