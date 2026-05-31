const YANDEX_API = 'https://api.music.yandex.net';
const HEADERS = {
  'X-Yandex-Music-Client': 'YandexMusicDesktopAppWindows/3.0.0',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0',
};
const CHART_TTL = 60 * 60 * 1000;

interface ChartEntry {
  track_id: number;
  position: number;
  progress: 'up' | 'down' | 'same';
}

interface YandexTrackData {
  url: string | null;
  search_url: string;
  likes_count: number | null;
  chart: { position: number; progress: 'up' | 'down' | 'same' } | null;
}

let chartCache: { data: ChartEntry[]; ts: number } | null = null;

function buildSearchUrl(title: string, artist: string): string {
  const query = encodeURIComponent(`${artist} ${title}`);
  return `https://music.yandex.ru/search?text=${query}`;
}

// Keep legacy export for any callers that haven't been updated
export function getSearchUrl(title: string, artist: string): string {
  return buildSearchUrl(title, artist);
}

async function fetchChart(): Promise<ChartEntry[]> {
  if (chartCache && Date.now() - chartCache.ts < CHART_TTL) return chartCache.data;

  try {
    const resp = await fetch(`${YANDEX_API}/landing3?blocks=chart&lang=ru`, { headers: HEADERS });
    if (!resp.ok) return [];

    const json = await resp.json() as any;
    const entities: any[] = json?.result?.blocks?.[0]?.entities ?? [];

    const data: ChartEntry[] = entities
      .map((e: any, idx: number) => ({
        track_id: Number(e?.data?.track?.id),
        position: idx + 1,
        progress: (['up', 'down', 'same'].includes(e?.data?.chart?.progress)
          ? e.data.chart.progress
          : 'same') as 'up' | 'down' | 'same',
      }))
      .filter((e) => e.track_id);

    chartCache = { data, ts: Date.now() };
    return data;
  } catch {
    return [];
  }
}

export async function getTrackInfo(title: string, artist: string): Promise<YandexTrackData> {
  const search_url = buildSearchUrl(title, artist);

  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const resp = await fetch(
      `${YANDEX_API}/search?type=track&text=${query}&page=0&pageSize=1&lang=ru`,
      { headers: HEADERS }
    );

    if (!resp.ok) return { url: null, search_url, likes_count: null, chart: null };

    const json = await resp.json() as any;
    const track = json?.result?.tracks?.results?.[0];

    if (!track) return { url: null, search_url, likes_count: null, chart: null };

    const trackId = Number(track.id);
    const url = `https://music.yandex.ru/track/${trackId}`;
    const likes_count = typeof track.likesCount === 'number' ? track.likesCount : null;

    const chartEntries = await fetchChart();
    const entry = chartEntries.find((e) => e.track_id === trackId);
    const chart = entry ? { position: entry.position, progress: entry.progress } : null;

    return { url, search_url, likes_count, chart };
  } catch {
    return { url: null, search_url, likes_count: null, chart: null };
  }
}
