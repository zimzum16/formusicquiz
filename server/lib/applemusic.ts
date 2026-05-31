const ITUNES_RSS = 'https://rss.applemarketingtools.com/api/v2/ru/music/most-played/100/songs.json';
const CHART_TTL = 60 * 60 * 1000;

interface ChartItem {
  name: string;
  artistName: string;
  position: number;
}

interface AppleMusicData {
  search_url: string;
  chart: { position: number; country: 'ru' } | null;
}

let chartCache: { data: ChartItem[]; ts: number } | null = null;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function fetchChart(): Promise<ChartItem[]> {
  if (chartCache && Date.now() - chartCache.ts < CHART_TTL) return chartCache.data;

  try {
    const resp = await fetch(ITUNES_RSS);
    if (!resp.ok) return [];

    const json = await resp.json() as any;
    const results: any[] = json?.feed?.results ?? [];

    const data: ChartItem[] = results.map((r: any, idx: number) => ({
      name: String(r.name ?? ''),
      artistName: String(r.artistName ?? ''),
      position: idx + 1,
    }));

    chartCache = { data, ts: Date.now() };
    return data;
  } catch {
    return [];
  }
}

export async function getAppleMusicData(title: string, artist: string): Promise<AppleMusicData> {
  const query = encodeURIComponent(`${artist} ${title}`);
  const search_url = `https://music.apple.com/ru/search?term=${query}`;

  try {
    const chart = await fetchChart();
    const entry = chart.find(
      (item) => isMatch(item.name, title) && isMatch(item.artistName, artist)
    );
    return {
      search_url,
      chart: entry ? { position: entry.position, country: 'ru' } : null,
    };
  } catch {
    return { search_url, chart: null };
  }
}
