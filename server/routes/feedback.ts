import { Hono } from 'hono';
import { z } from 'zod';
import { Redis } from '@upstash/redis';

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
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(8000),
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

  sendTelegram(tgText).catch(() => {});

  return c.json({ ok: true });
});

export default router;
