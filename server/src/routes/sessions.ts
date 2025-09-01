import { Hono } from 'hono';
import { setSignedCookie, deleteCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import type { JWTPayload } from '../types/auth.js';
import { PrismaClient } from '../generated/prisma/index.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

const sessions = new Hono();

const secret = process.env.JWT_SECRET || 'a-very-secure-and-long-secret-key';
const cookieName = 'auth_token';

sessions.post('/', async (c) => {
  const { email, password } = await c.req.json();

  // DBからユーザーを検索
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }
  // 入力パスワード+DBのsaltでハッシュ
  const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha256').toString('hex');
  if (user.password !== hash) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  const payload: JWTPayload = {
    sub: user.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1時間有効
    accountType: user.accountType || undefined,
    email: user.email,
  };
  const token = await sign(payload, secret);

  await setSignedCookie(c, cookieName, token, secret, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });

  return c.json({ message: 'Logged in successfully' });
});

sessions.delete('/current', async (c) => {
  deleteCookie(c, cookieName, {
    path: '/',
  });
  return c.json({ message: 'Logged out successfully' });
});

export default sessions;
