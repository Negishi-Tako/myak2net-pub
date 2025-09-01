import { Hono } from 'hono';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import type { User } from '../types/auth.js';
import { PrismaClient, Prisma } from '../generated/prisma/index.js';

const prisma = new PrismaClient();
const roles = new Hono<{ Variables: { user: User } }>();

// 一覧取得（認証必須）
roles.get('/', authMiddleware, async (c) => {
  const all = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  return c.json({ roles: all });
});

// 追加（管理者のみ）
roles.post('/', authMiddleware, adminOnly, async (c) => {
  const { name } = await c.req.json();
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ message: 'Role name is required' }, 400);
  }
  try {
    const created = await prisma.role.create({ data: { name: name.trim() } });
    return c.json({ role: created }, 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return c.json({ message: 'Role name already exists' }, 409);
    }
    return c.json({ message: 'Failed to create role' }, 500);
  }
});

// 削除（管理者のみ）
roles.delete('/:id', authMiddleware, adminOnly, async (c) => {
  const id = c.req.param('id');
  try {
    await prisma.role.delete({ where: { id } });
    return c.json({ message: 'Role deleted' });
  } catch (e) {
    return c.json({ message: 'Failed to delete role' }, 500);
  }
});

export default roles;
