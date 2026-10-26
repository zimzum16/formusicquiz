import { Redis } from '@upstash/redis';

const MEM_TTL = 60 * 60 * 1000;
const MEM_MAX_ENTRIES = 1000;

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

// Память — первый уровень перед Redis: каждый поход в Upstash — это HTTPS-запрос (0.5–2.5 с),
// а без Redis (локальная разработка) — единственный кэш
const memCache = new Map<string, { data: unknown; expiresAt: number }>();

function memSet(key: string, data: unknown, ttlS?: number) {
  memCache.delete(key);
  memCache.set(key, { data, expiresAt: Date.now() + (ttlS ? ttlS * 1000 : MEM_TTL) });
  // Map хранит порядок вставки — первым идёт самый старый ключ
  if (memCache.size > MEM_MAX_ENTRIES) memCache.delete(memCache.keys().next().value!);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const e = memCache.get(key);
  if (e && Date.now() < e.expiresAt) return e.data as T;
  if (!redis) return null;
  const data = await redis.get<T>(key);
  if (data !== null) memSet(key, data);
  return data;
}

export async function cacheSet<T>(key: string, data: T, ttlS?: number): Promise<void> {
  memSet(key, data, ttlS);
  if (redis) await redis.set(key, data, ttlS ? { ex: ttlS } : undefined);
}
