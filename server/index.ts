import { serve } from '@hono/node-server';
import app from './app.js';

const port = Number(process.env.PORT) || 3001;
console.log(`Server: http://localhost:${port}`);
console.log(`Docs:   http://localhost:${port}/docs`);

serve({ fetch: app.fetch, port });
