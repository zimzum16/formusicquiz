import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import tracksRouter from './routes/tracks.js';

const app = new OpenAPIHono();

app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.route('/api/tracks', tracksRouter);

app.get('/api/health', (c) => c.json({ ok: true }));

// Прокси для скрапинга — используется Vercel-функцией, которая блокируется Genius
// Сам эндпоинт работает только когда запускается на VPS (там IP не заблокирован)
const ALLOWED_SCRAPE_HOSTS = ['genius.com'];
app.get('/api/scrape', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: 'url required' }, 400);
  try {
    const { hostname } = new URL(url);
    if (!ALLOWED_SCRAPE_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
      return c.json({ error: 'host not allowed' }, 403);
    }
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    return c.text(html, res.status as 200);
  } catch (e) {
    console.error('[scrape] error:', e);
    return c.json({ error: 'fetch failed' }, 500);
  }
});

app.doc('/api/spec', {
  openapi: '3.0.0',
  info: { title: 'SoundLens API', version: '1.0.0' },
});

app.get('/docs', swaggerUI({ url: '/api/spec' }));

export default app;
