import { namesOverlap } from './text.js';

const RSS_BASE = 'https://rss.applemarketingtools.com/api/v2';
const CHART_TTL = 60 * 60 * 1000;

const COUNTRIES = ['ru', 'us', 'gb', 'de', 'fr', 'au', 'mx', 'se', 'jp', 'kr'] as const;
type Country = typeof COUNTRIES[number];

interface ChartItem {
  name: string;
  artistName: string;
  position: number;
}

export interface AppleMusicData {
  search_url: string;
  charts: { position: number; country: string }[];
}

const chartCaches = new Map<Country, { data: ChartItem[]; ts: number }>();

const stripFeat = (s: string) => s.replace(/\(feat\..*?\)/gi, '');
const isMatch = (a: string, b: string) => namesOverlap(stripFeat(a), stripFeat(b));

interface AppleRssResponse {
  feed?: { results?: Array<{ name?: string; artistName?: string }> };
}

async function fetchChart(country: Country): Promise<ChartItem[]> {
  const cached = chartCaches.get(country);
  if (cached && Date.now() - cached.ts < CHART_TTL) return cached.data;

  try {
    const resp = await fetch(`${RSS_BASE}/${country}/music/most-played/100/songs.json`);
    if (!resp.ok) return [];
    const json = await resp.json() as AppleRssResponse;
    const results = json?.feed?.results ?? [];
    const data: ChartItem[] = results.map((r, idx) => ({
      name: String(r.name ?? ''),
      artistName: String(r.artistName ?? ''),
      position: idx + 1,
    }));
    chartCaches.set(country, { data, ts: Date.now() });
    return data;
  } catch {
    return [];
  }
}

export async function getAppleMusicData(title: string, artist: string): Promise<AppleMusicData> {
  const query = encodeURIComponent(`${artist} ${title}`);
  const search_url = `https://music.apple.com/ru/search?term=${query}`;

  const results = await Promise.allSettled(
    COUNTRIES.map(async (country) => {
      const chart = await fetchChart(country);
      const entry = chart.find(item => isMatch(item.name, title) && isMatch(item.artistName, artist));
      return entry ? { position: entry.position, country } : null;
    })
  );

  const charts: { position: number; country: string }[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value !== null) charts.push(r.value);
  }

  return { search_url, charts };
}
