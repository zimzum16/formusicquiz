import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import db from '../db.js';

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-prod');

export const requireAuth = createMiddleware<{ Variables: { userId: number } }>(
  async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    try {
      await jwtVerify(token, getSecret());

      const session = db
        .prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > unixepoch()')
        .get(token) as { user_id: number } | undefined;

      if (!session) return c.json({ error: 'Session expired' }, 401);

      c.set('userId', session.user_id);
      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  }
);
