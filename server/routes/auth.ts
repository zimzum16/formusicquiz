import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import db from '../db.js';
import { requireAuth } from '../middleware/session.js';

const router = new Hono<{ Variables: { userId: number } }>();

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 дней в секундах

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-prod');

async function createSession(userId: number): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL;

  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret());

  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  );

  return token;
}

router.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const { email, password } = body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return c.json({ error: 'Email и пароль обязательны' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: 'Пароль минимум 8 символов' }, 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let result;
  try {
    result = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(email, passwordHash);
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return c.json({ error: 'Email уже зарегистрирован' }, 409);
    }
    throw err;
  }

  const userId = Number(result.lastInsertRowid);
  const token = await createSession(userId);

  return c.json({ token, user: { id: userId, email } }, 201);
});

router.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const { email, password } = body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return c.json({ error: 'Email и пароль обязательны' }, 400);
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | { id: number; email: string; password_hash: string }
    | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return c.json({ error: 'Неверный email или пароль' }, 401);
  }

  const token = await createSession(user.id);

  return c.json({ token, user: { id: user.id, email: user.email } });
});

router.post('/logout', requireAuth, (c) => {
  const token = c.req.header('Authorization')!.replace('Bearer ', '');
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  return c.json({ ok: true });
});

router.get('/me', requireAuth, (c) => {
  const userId = c.get('userId');
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as
    | { id: number; email: string }
    | undefined;

  if (!user) return c.json({ user: null });
  return c.json({ user });
});

export default router;
