import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import db from '../db.js';
import { requireAuth } from '../middleware/session.js';

const router = new OpenAPIHono<{ Variables: { userId: number } }>();

const SESSION_TTL = 7 * 24 * 60 * 60;

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

// Схемы
const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
});

const AuthBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

const ErrorSchema = z.object({ error: z.string() });

// Роуты
const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  request: {
    body: { content: { 'application/json': { schema: AuthBodySchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: AuthResponseSchema } },
      description: 'Пользователь создан',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Ошибка валидации',
    },
    409: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Email уже зарегистрирован',
    },
  },
});

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  request: {
    body: { content: { 'application/json': { schema: AuthBodySchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: AuthResponseSchema } },
      description: 'Успешный вход',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Неверные данные',
    },
  },
});

const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
      description: 'Выход выполнен',
    },
  },
});

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  responses: {
    200: {
      content: {
        'application/json': { schema: z.object({ user: UserSchema.nullable() }) },
      },
      description: 'Текущий пользователь',
    },
  },
});

// Хендлеры
router.openapi(registerRoute, async (c) => {
  const { email, password } = c.req.valid('json');

  const passwordHash = await bcrypt.hash(password, 10);

  let result;
  try {
    result = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(email, passwordHash);
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return c.json({ error: 'Email уже зарегистрирован' }, 409);
    }
    throw err;
  }

  const userId = Number(result.lastInsertRowid);
  const token = await createSession(userId);

  return c.json({ token, user: { id: userId, email } }, 201);
});

router.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | { id: number; email: string; password_hash: string }
    | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return c.json({ error: 'Неверный email или пароль' }, 401);
  }

  const token = await createSession(user.id);

  return c.json({ token, user: { id: user.id, email: user.email } }, 200);
});

router.use('/logout', requireAuth);
router.openapi(logoutRoute, (c) => {
  const token = c.req.header('Authorization')!.replace('Bearer ', '');
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  return c.json({ ok: true }, 200);
});

router.use('/me', requireAuth);
router.openapi(meRoute, (c) => {
  const userId = c.get('userId');
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as
    | { id: number; email: string }
    | undefined;

  if (!user) return c.json({ user: null }, 200);
  return c.json({ user }, 200);
});

export default router;
