import { type Context, type Next } from 'hono';
import { getSignedCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { PrismaClient } from '../generated/prisma/index.js';
import type { JWTPayload, User } from '../types/auth.js';

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET || 'a-very-secure-and-long-secret-key';
const cookieName = 'auth_token';

export const authMiddleware = async (c: Context, next: Next) => {
  const token = await getSignedCookie(c, secret, cookieName);

  if (!token) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, secret) as JWTPayload;

    // Verify user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      // If user is not found, the token is for a deleted user.
      return c.json({ message: 'Unauthorized: User not found' }, 401);
    }

    // Attach the full, validated user object to the context
    c.set('user', user);
    await next();
  } catch (err) {
    return c.json({ message: 'Invalid token' }, 401);
  }
};

export const adminOnly = async (c: Context, next: Next) => {
  const user = c.get('user') as User;
  if (user?.accountType !== 'admin' && user?.accountType !== 'superadmin') {
    return c.json({ message: 'Forbidden: Admin access required' }, 403);
  }
  await next();
};
