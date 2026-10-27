import { Hono } from 'hono';
import { z } from 'zod';
import { redis } from '../lib/cache.js';

const router = new Hono();

const schema = z.object({
  message: z.string().min(1).max(2000),
  contact: z.string().max(200).optional(),
});

async function sendNotification(text: string) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Title': 'New feedback TrackSlice' },
    body: text,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) console.error('[ntfy] failed:', res.status);
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

  // Архив в Redis — не критичен: если Upstash недоступен, уведомление всё равно уходит
  if (redis) {
    await redis.lpush('feedback', JSON.stringify({
      message,
      contact: contact ?? null,
      created_at: Date.now(),
    })).catch((e) => console.error('[feedback] redis error:', e?.message ?? e));
  }

  // ntfy принимает text/plain — разметка Telegram (<b>, <i>) показывалась бы буквально
  const text = contact ? `${message}\n\nКонтакт: ${contact}` : message;

  sendNotification(text).catch((e) => console.error('[ntfy] error:', e?.message ?? e));

  return c.json({ ok: true });
});

export default router;
