import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import sessions from './routes/sessions.js';
import users from './routes/users.js';
import roles from './routes/roles.js';
import logs from './routes/logs.js';
import type { User } from './types/auth.js';

const app = new Hono<{ Variables: { user: User } }>();

// CORS (allow credentials; reflect origin)
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ヘルスチェックエンドポイント
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/sessions', sessions);
app.route('/users', users);
app.route('/roles', roles);
app.route('/log', logs);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);