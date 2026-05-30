import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRouter from './routes/auth.js';
import tracksRouter from './routes/tracks.js';

const app = new OpenAPIHono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.route('/api/auth', authRouter);
app.route('/api/tracks', tracksRouter);

app.get('/api/health', (c) => c.json({ ok: true }));

app.doc('/api/spec', {
  openapi: '3.0.0',
  info: { title: 'SoundLens API', version: '1.0.0' },
});

app.get('/docs', swaggerUI({ url: '/api/spec' }));

const port = Number(process.env.PORT) || 3001;
console.log(`Server: http://localhost:${port}`);
console.log(`Docs:   http://localhost:${port}/docs`);

serve({ fetch: app.fetch, port });
