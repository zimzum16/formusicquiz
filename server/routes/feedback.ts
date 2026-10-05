import { Hono } from 'hono';
import { z } from 'zod';
import { Redis } from '@upstash/redis';
import { SocksProxyAgent } from 'socks-proxy-agent';
import https from 'https';

const router = new Hono();

const schema = z.object({
  message: z.string().min(1).max(2000),
  contact: z.string().max(200).optional(),
});

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const proxyUrl = process.env.PROXY_URL;
  if (!token || !chatId) {
    console.error('[telegram] missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return;
  }

  const agent = proxyUrl ? new SocksProxyAgent(proxyUrl) : undefined;

  await new Promise<void>((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      agent,
      timeout: 8000,
    }, (res) => {
      res.resume();
      if (res.statusCode && res.statusCode >= 400) {
        console.error('[telegram] sendMessage failed:', res.statusCode);
      }
      resolve();
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

router.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Validation error' }, 400);

  const { message, contact } = parsed.data;

  if (redis) {
    await redis.lpush('feedback', JSON.stringify({
      message,
      contact: contact ?? null,
      created_at: Date.now(),
    }));
  }

  const tgText = [
    '📬 <b>Новый фидбек</b>',
    '',
    message,
    contact ? `\n<i>Контакт: ${contact}</i>` : '',
  ].join('\n');

  sendTelegram(tgText).catch((e) => console.error('[telegram] error:', e?.message ?? e));

  return c.json({ ok: true });
});

export default router;
