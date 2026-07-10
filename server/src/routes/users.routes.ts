import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const usersRouter = Router();
usersRouter.use(authenticate);

async function findExistingUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

usersRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const viewerId = req.userId!;
    const user = await findExistingUser(id);

    const [followersCount, followingCount, postsCount, viewerFollow] = await Promise.all([
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } }),
      prisma.post.count({ where: { authorId: id } }),
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: id } },
      }),
    ]);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
        followersCount,
        followingCount,
        postsCount,
        isFollowedByMe: Boolean(viewerFollow),
      },
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/:id/follow', async (req, res, next) => {
  try {
    const followingId = req.params.id as string;
    const followerId = req.userId!;

    if (followingId === followerId) {
      throw new AppError(400, 'You cannot follow yourself');
    }
    await findExistingUser(followingId);

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) {
      throw new AppError(409, 'Already following this user');
    }

    await prisma.follow.create({ data: { followerId, followingId } });
    res.status(201).send();
  } catch (err) {
    next(err);
  }
});

usersRouter.delete('/:id/follow', async (req, res, next) => {
  try {
    const followingId = req.params.id as string;
    const followerId = req.userId!;

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing) {
      throw new AppError(404, 'Not following this user');
    }

    await prisma.follow.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
