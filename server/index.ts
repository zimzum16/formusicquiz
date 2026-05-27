import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRouter from './routes/auth.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.route('/api/auth', authRouter);

app.get('/api/health', (c) => c.json({ ok: true }));

const port = Number(process.env.PORT) || 3001;
console.log(`Server: http://localhost:${port}`);

serve({ fetch: app.fetch, port });
