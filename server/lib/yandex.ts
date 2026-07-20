const YANDEX_API = 'https://api.music.yandex.net';

function getHeaders(): Record<string, string> {
  const token = process.env.YANDEX_MUSIC_TOKEN;
  return {
    'X-Yandex-Music-Client': 'YandexMusicDesktopAppWindows/3.0.0',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0',
    ...(token ? { Authorization: `OAuth ${token}` } : {}),
  };
}

async function yandexFetch(url: string): Promise<Response | null> {
  const token = process.env.YANDEX_MUSIC_TOKEN;
  const headers = getHeaders();

  // Прямой запрос
  try {
    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    if (resp.ok) return resp;
    console.log('[yandex] direct status:', resp.status, '— trying ScraperBee');
  } catch { /* timeout */ }

  // Через ScraperBee с российским residential IP
  const sbKeys = (process.env.SCRAPERBEE_KEYS ?? '').split(',').map(k => k.trim()).filter(Boolean);
  for (const key of sbKeys) {
    try {
      const sbUrl = `https://app.scrapingbee.com/api/v1/?api_key=${key}&url=${encodeURIComponent(url)}&render_js=false&premium_proxy=true&country_code=ru&forward_headers_pure=true`;
      const resp = await fetch(sbUrl, {
        headers: {
          'Spb-Authorization': token ? `OAuth ${token}` : '',
          'Spb-X-Yandex-Music-Client': 'YandexMusicDesktopAppWindows/3.0.0',
          'Spb-Accept': 'application/json',
        },
        signal: AbortSignal.timeout(12000),
      });
      console.log('[yandex] scraperbee status:', resp.status, `(key ...${key.slice(-6)})`);
      if (resp.ok) return resp;
    } catch { /* try next key */ }
  }

  return null;
}
const CHART_TTL = 60 * 60 * 1000;

interface ChartEntry {
  track_id: number;
  position: number;
  progress: 'up' | 'down' | 'same';
}

interface YandexTrackData {
  url: string | null;
  search_url: string;
  play_count: number | null;
  chart: { position: number; progress: 'up' | 'down' | 'same' } | null;
}

let chartCache: { data: ChartEntry[]; ts: number } | null = null;

function buildSearchUrl(title: string, artist: string): string {
  const query = encodeURIComponent(`${artist} ${title}`);
  return `https://music.yandex.ru/search?text=${query}`;
}


async function fetchChart(): Promise<ChartEntry[]> {
  if (chartCache && Date.now() - chartCache.ts < CHART_TTL) return chartCache.data;

  try {
    const resp = await yandexFetch(`${YANDEX_API}/landing3?blocks=chart&lang=ru`);
    if (!resp) return [];

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
    const resp = await yandexFetch(
      `${YANDEX_API}/search?type=track&text=${query}&page=0&pageSize=1&lang=ru`
    );

    if (!resp) return { url: null, search_url, play_count: null, chart: null };

    const json = await resp.json() as any;
    const track = json?.result?.tracks?.results?.[0];

    if (!track) return { url: null, search_url, play_count: null, chart: null };

    const trackId = Number(track.id);
    const url = `https://music.yandex.ru/track/${trackId}`;
    const play_count = typeof track.playCount === 'number' ? track.playCount : null;

    const chartEntries = await fetchChart();
    const entry = chartEntries.find((e) => e.track_id === trackId);
    const chart = entry ? { position: entry.position, progress: entry.progress } : null;

    return { url, search_url, play_count, chart };
  } catch {
    return { url: null, search_url, play_count: null, chart: null };
  }
}
