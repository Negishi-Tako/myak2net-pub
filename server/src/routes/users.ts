import { Hono } from 'hono';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import type { User } from '../types/auth.js';
import { PrismaClient, Prisma } from '../generated/prisma/index.js';
import crypto from 'crypto';

const prisma = new PrismaClient();
const users = new Hono<{ Variables: { user: User } }>();

// Get current user info
users.get('/me', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// Get all roles for the current user
users.get('/me/roles', authMiddleware, async (c) => {
    const user = c.get('user');
    const userRoles = await prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
    });
    const roles = userRoles.map(ur => ur.role);
    return c.json({ roles });
});

// Get all users (Admin only)
users.get('/', authMiddleware, adminOnly, async (c) => {
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, accountType: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ users: allUsers });
});

// Assign or update a role for a user (Admin only)
// PUT /users/:id/roles/:roleId  Body(optional): { grade?, class?, classnum?, team?, teamnum? }
users.put('/:id/roles/:roleId', authMiddleware, adminOnly, async (c) => {
  const userId = c.req.param('id');
  const roleId = c.req.param('roleId');
  const meta = await c.req.json().catch(() => ({}));

  try {
    const updateData: any = {
      grade: meta.grade ?? null,
      class: meta.class ?? null,
      classnum: meta.classnum ?? null,
      team: meta.team ?? null,
      teamnum: meta.teamnum ?? null,
    };
    const createData: any = {
      userId,
      roleId,
      ...updateData,
    };

    const assigned = await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: updateData,
      create: createData,
    });
    return c.json({ userRole: assigned });
  } catch (e) {
    return c.json({ message: 'Failed to assign role' }, 500);
  }
});

// Remove a role from a user (Admin only)
// DELETE /users/:id/roles/:roleId
users.delete('/:id/roles/:roleId', authMiddleware, adminOnly, async (c) => {
  const userId = c.req.param('id');
  const roleId = c.req.param('roleId');
  try {
    await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
    return c.json({ message: 'Role removed' });
  } catch (e) {
    return c.json({ message: 'Failed to remove role' }, 500);
  }
});

// List user's roles (Admin only or self)
// GET /users/:id/roles
users.get('/:id/roles', authMiddleware, async (c) => {
  const requester = c.get('user');
  const userId = c.req.param('id');
  if (requester.id !== userId && requester.accountType !== 'admin' && requester.accountType !== 'superadmin') {
    return c.json({ message: 'Forbidden' }, 403);
  }
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return c.json({ userRoles: roles });
});

// Create a new user (Admin only)
users.post('/', authMiddleware, adminOnly, async (c) => {
  const { email, password, accountType } = await c.req.json();
  const loggedInUser = c.get('user');

  // Only superadmins can create superadmin accounts
  if (accountType === 'superadmin' && loggedInUser.accountType !== 'superadmin') {
    return c.json({ message: 'Forbidden: You do not have permission to create a superadmin.' }, 403);
  }

  if (!email || !password) {
    return c.json({ message: 'Email and password are required' }, 400);
  }
  if (password.length < 6) {
    return c.json({ message: 'Password must be at least 6 characters long' }, 400);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');

  try {
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hash,
        salt,
        accountType: accountType || 'user',
      },
      select: { id: true, email: true, accountType: true, createdAt: true, updatedAt: true },
    });
    return c.json({ user: newUser }, 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return c.json({ message: 'Failed to create user. Email may already be in use.' }, 409);
    }
    return c.json({ message: 'Failed to create user.' }, 500);
  }
});

// Delete a user (Admin only)
users.delete('/:id', authMiddleware, adminOnly, async (c) => {
  const loggedInUser = c.get('user');
  const userIdToDelete = c.req.param('id');

  if (loggedInUser.id === userIdToDelete) {
    return c.json({ message: "You cannot delete yourself." }, 400);
  }

  try {
    const userToDelete = await prisma.user.findUnique({ where: { id: userIdToDelete } });
    if (!userToDelete) {
      return c.json({ message: 'User not found.' }, 404);
    }

    // Prevent admins from deleting superadmins
    if (userToDelete.accountType === 'superadmin' && loggedInUser.accountType !== 'superadmin') {
      return c.json({ message: 'Forbidden: You do not have permission to delete a superadmin.' }, 403);
    }

    await prisma.user.delete({ where: { id: userIdToDelete } });
    return c.json({ message: 'User deleted successfully' });
  } catch (e) {
    return c.json({ message: 'Failed to delete user.' }, 500);
  }
});

// Update a user's role (Admin only)
users.patch('/:id/role', authMiddleware, adminOnly, async (c) => {
  const loggedInUser = c.get('user');
  const userIdToUpdate = c.req.param('id');
  const { accountType } = await c.req.json();

  if (loggedInUser.id === userIdToUpdate) {
    return c.json({ message: "You cannot change your own role." }, 400);
  }

  if (!['user', 'admin', 'superadmin'].includes(accountType)) {
    return c.json({ message: 'Invalid account type specified.' }, 400);
  }

  try {
    const userToUpdate = await prisma.user.findUnique({ where: { id: userIdToUpdate } });
    if (!userToUpdate) {
      return c.json({ message: 'User not found.' }, 404);
    }

    // Prevent admins from promoting users to superadmin or changing superadmins' roles
    if (
      (accountType === 'superadmin' || userToUpdate.accountType === 'superadmin') &&
      loggedInUser.accountType !== 'superadmin'
    ) {
      return c.json({ message: 'Forbidden: You do not have permission to perform this action.' }, 403);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userIdToUpdate },
      data: { accountType },
      select: { id: true, email: true, accountType: true },
    });
    return c.json({ message: 'User role updated successfully', user: updatedUser });
  } catch (e) {
    return c.json({ message: 'Failed to update user role.' }, 500);
  }
});

// Validate user credentials (for login)
users.post('/validate', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ message: 'Email and password are required' }, 400);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.salt) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }
  const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha256').toString('hex');
  if (user.password !== hash) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }
  return c.json({ message: 'Validated' });
});

users.put('/:id/passwd',authMiddleware,adminOnly,async (c) => {
  const userId = c.req.param('id');
  const { currentPassword, newPassword } = await c.req.json();

  if (!currentPassword || !newPassword) {
    return c.json({ message: 'Current password and new password are required' }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.salt) {
    return c.json({ message: 'Invalid user' }, 401);
  }

  const hash = crypto.pbkdf2Sync(currentPassword, user.salt, 1000, 64, 'sha256').toString('hex');
  if (user.password !== hash) {
    return c.json({ message: 'Invalid current password' }, 401);
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = crypto.pbkdf2Sync(newPassword, newSalt, 1000, 64, 'sha256').toString('hex');

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHash, salt: newSalt }
    });
    return c.json({ message: 'Password updated successfully' });
  } catch (e) {
    return c.json({ message: 'Failed to update password' }, 500);
  }
});

// Update AbuseIPDB API key (self or admin)
users.patch('/:id/abuseipdb-key', authMiddleware, async (c) => {
  const requester = c.get('user');
  const userId = c.req.param('id');
  const { abuseipdbApiKey } = await c.req.json();

  // 自分自身または管理者のみ更新可能
  if (requester.id !== userId && requester.accountType !== 'admin' && requester.accountType !== 'superadmin') {
    return c.json({ message: 'Forbidden' }, 403);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { abuseipdbApiKey },
      select: { id: true, email: true, accountType: true, abuseipdbApiKey: true },
    });
    return c.json({ 
      message: 'AbuseIPDB APIキーを更新しました', 
      user: updatedUser 
    });
  } catch (e) {
    return c.json({ message: 'AbuseIPDB APIキーの更新に失敗しました' }, 500);
  }
});


export default users;
