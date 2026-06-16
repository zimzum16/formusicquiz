import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import tracksRouter from './routes/tracks.js';

const app = new OpenAPIHono();

app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.route('/api/tracks', tracksRouter);

app.get('/api/health', (c) => c.json({ ok: true }));

app.doc('/api/spec', {
  openapi: '3.0.0',
  info: { title: 'SoundLens API', version: '1.0.0' },
});

app.get('/docs', swaggerUI({ url: '/api/spec' }));

export default app;
