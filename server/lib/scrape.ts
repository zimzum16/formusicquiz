// Загрузка HTML страниц Genius. IP Vercel (а иногда и VPS) Genius блокирует, поэтому каскад:
// напрямую → свой прокси на VPS → платные скрейперы. Бесплатные способы идут первыми, чтобы не тратить квоту
export const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// Ключи из env: список через запятую и/или одиночная переменная
function envKeys(...names: string[]): string[] {
  return names.flatMap(n => (process.env[n] ?? '').split(',')).map(k => k.trim()).filter(Boolean);
}

async function tryFetch(label: string, url: string, timeoutMs: number, headers?: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    console.log(`[scrape] ${label} status:`, res.status);
    return res.ok ? await res.text() : null;
  } catch (e) {
    console.log(`[scrape] ${label} failed:`, e instanceof Error ? e.name : e);
    return null;
  }
}

async function fetchCascade(pageUrl: string): Promise<string> {
  const u = encodeURIComponent(pageUrl);

  const direct = await tryFetch('direct', pageUrl, 10000, BROWSER_HEADERS);
  if (direct) return direct;

  const proxyBase = process.env.SCRAPE_PROXY_URL;
  if (proxyBase) {
    const proxied = await tryFetch('proxy', `${proxyBase}/api/scrape?url=${u}`, 15000);
    if (proxied) return proxied;
  }

  // ScrapingBee — параллельно: кто первым ответил, тот и выиграл
  const beeKeys = envKeys('SCRAPERBEE_KEYS');
  if (beeKeys.length) {
    const html = await Promise.any(beeKeys.map(async key => {
      const r = await tryFetch(`scrapingbee ...${key.slice(-6)}`, `https://app.scrapingbee.com/api/v1/?api_key=${key}&url=${u}&render_js=false`, 15000);
      if (!r) throw new Error('failed');
      return r;
    })).catch(() => null);
    if (html) return html;
  }

  // ScraperAPI и scrape.do — по очереди: у каждого ключа своя квота
  for (const key of envKeys('SCRAPERAPI_KEYS', 'SCRAPERAPI_KEY')) {
    const html = await tryFetch('scraperapi', `http://api.scraperapi.com?api_key=${key}&url=${u}`, 15000);
    if (html) return html;
  }
  for (const key of envKeys('SCRAPERDO_KEYS', 'SCRAPERDO_KEY')) {
    const html = await tryFetch('scrapedo', `https://api.scrape.do?token=${key}&url=${u}`, 30000);
    if (html) return html;
  }
  return '';
}

// Одну и ту же страницу запрашивают и searchSong (теги), и /lyrics (текст) — сразу друг за другом.
// Короткий кэш и общий промис для параллельных запросов, чтобы не платить за страницу дважды
const HTML_TTL = 5 * 60 * 1000;
const HTML_MAX_ENTRIES = 20;
const htmlCache = new Map<string, { html: Promise<string>; expiresAt: number }>();

// '' — если ни один способ не сработал
export function fetchGeniusHtml(pageUrl: string): Promise<string> {
  const hit = htmlCache.get(pageUrl);
  if (hit && hit.expiresAt > Date.now()) return hit.html;

  const html = fetchCascade(pageUrl);
  htmlCache.set(pageUrl, { html, expiresAt: Date.now() + HTML_TTL });
  if (htmlCache.size > HTML_MAX_ENTRIES) htmlCache.delete(htmlCache.keys().next().value!);
  // Неудачу не кэшируем — следующий запрос попробует снова
  html.then(h => { if (!h) htmlCache.delete(pageUrl); });
  return html;
}
