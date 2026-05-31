const RSS_BASE = 'https://rss.applemarketingtools.com/api/v2';
const CHART_TTL = 60 * 60 * 1000;

const COUNTRIES = ['ru', 'us', 'gb', 'de', 'fr', 'au', 'mx', 'se', 'jp', 'kr'] as const;
type Country = typeof COUNTRIES[number];

// Pre-warm all country caches on module load so first user request is fast
setTimeout(() => {
  for (const country of COUNTRIES) fetchChart(country).catch(() => {});
}, 0);

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
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function fetchChart(country: Country): Promise<ChartItem[]> {
  const cached = chartCaches.get(country);
  if (cached && Date.now() - cached.ts < CHART_TTL) return cached.data;

  try {
    const resp = await fetch(`${RSS_BASE}/${country}/music/most-played/100/songs.json`);
    if (!resp.ok) return [];
    const json = await resp.json() as any;
    const results: any[] = json?.feed?.results ?? [];
    const data: ChartItem[] = results.map((r: any, idx: number) => ({
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
