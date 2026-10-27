import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { OpenAPIHono } from '@hono/zod-openapi';

// db.ts открывает базу при импорте — подменяем путь до импорта роутера
const dir = mkdtempSync(path.join(tmpdir(), 'soundlens-auth-'));
let app: OpenAPIHono;

beforeAll(async () => {
  process.env.DB_PATH = path.join(dir, 'test.sqlite');
  const { OpenAPIHono } = await import('@hono/zod-openapi');
  const { default: auth } = await import('./auth.js');
  app = new OpenAPIHono();
  app.route('/api/auth', auth);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const post = (p: string, body?: unknown, token?: string) =>
  app.request(`/api/auth${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

const me = (token?: string) =>
  app.request('/api/auth/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} });

const creds = { email: 'user@example.com', password: 'password123' };

describe('auth', () => {
  it('регистрация → /me → logout → токен больше не действует', async () => {
    const reg = await post('/register', creds);
    expect(reg.status).toBe(201);
    const { token, user } = await reg.json();
    expect(user.email).toBe(creds.email);

    const meRes = await me(token);
    expect(meRes.status).toBe(200);
    expect((await meRes.json()).user).toEqual(user);

    expect((await post('/logout', undefined, token)).status).toBe(200);
    expect((await me(token)).status).toBe(401);
  });

  it('повторная регистрация того же email → 409', async () => {
    expect((await post('/register', creds)).status).toBe(409);
  });

  it('вход с верным и неверным паролем', async () => {
    expect((await post('/login', creds)).status).toBe(200);
    expect((await post('/login', { ...creds, password: 'wrong-password' })).status).toBe(401);
    expect((await post('/login', { ...creds, email: 'nobody@example.com' })).status).toBe(401);
  });

  it('два входа подряд дают две рабочие сессии', async () => {
    const a = await post('/login', creds);
    const b = await post('/login', creds);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect((await me((await a.json()).token)).status).toBe(200);
    expect((await me((await b.json()).token)).status).toBe(200);
  });

  it('валидация тела запроса', async () => {
    expect((await post('/register', { email: 'bad', password: 'password123' })).status).toBe(400);
    expect((await post('/register', { email: 'x@example.com', password: 'short' })).status).toBe(400);
  });

  it('/me и /logout без токена или с поддельным токеном → 401', async () => {
    expect((await me()).status).toBe(401);
    expect((await me('garbage')).status).toBe(401);
    expect((await post('/logout')).status).toBe(401);
  });
});
