import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchGeniusHtml } from './scrape.js';

const ENV = ['SCRAPE_PROXY_URL', 'SCRAPERBEE_KEYS', 'SCRAPERAPI_KEYS', 'SCRAPERAPI_KEY', 'SCRAPERDO_KEYS', 'SCRAPERDO_KEY'];

// Ответ по префиксу URL; всё, что не описано, — 403
function stubFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const fn = vi.fn(async (url: string) => {
    const key = Object.keys(routes).find(p => url.startsWith(p));
    return key ? routes[key]() : new Response('blocked', { status: 403 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const ok = (body: string) => () => new Response(body, { status: 200 });
const calledUrls = (fn: ReturnType<typeof stubFetch>) => fn.mock.calls.map(c => String(c[0]));

// У модуля общий кэш по URL — каждому тесту своя страница
let n = 0;
const page = () => `https://genius.com/song-${++n}-lyrics`;

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchGeniusHtml', () => {
  it('напрямую получилось — платные скрейперы не трогаем', async () => {
    process.env.SCRAPERBEE_KEYS = 'bee1';
    const url = page();
    const fn = stubFetch({ [url]: ok('direct html') });
    expect(await fetchGeniusHtml(url)).toBe('direct html');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('прямой запрос заблокирован → свой прокси', async () => {
    process.env.SCRAPE_PROXY_URL = 'https://vps.example';
    const fn = stubFetch({ 'https://vps.example/api/scrape': ok('proxy html') });
    expect(await fetchGeniusHtml(page())).toBe('proxy html');
    expect(calledUrls(fn)[1]).toContain('vps.example/api/scrape?url=https%3A%2F%2Fgenius.com');
  });

  it('таймаут не обрывает каскад, ScrapingBee-ключи идут параллельно', async () => {
    process.env.SCRAPERBEE_KEYS = 'bad, good';
    process.env.SCRAPERAPI_KEY = 'api1';
    const url = page();
    const fn = stubFetch({
      [url]: () => { throw new DOMException('timeout', 'TimeoutError'); },
      'https://app.scrapingbee.com/api/v1/?api_key=good': ok('bee html'),
    });
    expect(await fetchGeniusHtml(url)).toBe('bee html');
    expect(calledUrls(fn).some(u => u.includes('scraperapi'))).toBe(false);
  });

  it('ключи ScraperAPI из списка и одиночной переменной перебираются по очереди', async () => {
    process.env.SCRAPERAPI_KEYS = 'k1, k2';
    process.env.SCRAPERAPI_KEY = 'k3';
    const fn = stubFetch({ 'http://api.scraperapi.com?api_key=k3': ok('api html') });
    expect(await fetchGeniusHtml(page())).toBe('api html');
    expect(calledUrls(fn).filter(u => u.includes('scraperapi')).map(u => u.match(/api_key=(\w+)/)![1])).toEqual(['k1', 'k2', 'k3']);
  });

  it('последний шанс — scrape.do', async () => {
    process.env.SCRAPERDO_KEYS = 'do1';
    stubFetch({ 'https://api.scrape.do?token=do1': ok('do html') });
    expect(await fetchGeniusHtml(page())).toBe('do html');
  });

  it('параллельные запросы одной страницы и повтор в течение TTL — один поход в сеть', async () => {
    const url = page();
    const fn = stubFetch({ [url]: ok('html') });
    const [a, b] = await Promise.all([fetchGeniusHtml(url), fetchGeniusHtml(url)]);
    expect(await fetchGeniusHtml(url)).toBe('html');
    expect([a, b]).toEqual(['html', 'html']);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('неудача → пустая строка, и она не кэшируется', async () => {
    const url = page();
    stubFetch({});
    expect(await fetchGeniusHtml(url)).toBe('');
    const fn = stubFetch({ [url]: ok('later html') });
    expect(await fetchGeniusHtml(url)).toBe('later html');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
