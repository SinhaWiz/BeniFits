import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createPostSchema } from '../schemas/post.schema';

export const postsRouter = Router();
postsRouter.use(authenticate);

const MAX_TAKE = 50;
const DEFAULT_TAKE = 20;

function parseTake(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TAKE;
  return Math.min(parsed, MAX_TAKE);
}

function parseSkip(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const postAuthorSelect = { id: true, name: true, avatar: true, role: true };

async function findOwnedPost(id: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.authorId !== userId) {
    throw new AppError(404, 'Post not found');
  }
  return post;
}

postsRouter.get('/', async (req, res, next) => {
  try {
    const { authorId } = req.query;
    const take = parseTake(req.query.take);
    const skip = parseSkip(req.query.skip);

    const where: Record<string, unknown> = {};
    if (typeof authorId === 'string' && authorId.length > 0) {
      where.authorId = authorId;
    }

    const posts = await prisma.post.findMany({
      where,
      include: { author: { select: postAuthorSelect } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      skip,
    });

    const hasMore = posts.length > take;
    res.json({ posts: posts.slice(0, take), hasMore });
  } catch (err) {
    next(err);
  }
});

postsRouter.post('/', validateBody(createPostSchema), async (req, res, next) => {
  try {
    const { content } = req.body as ReturnType<typeof createPostSchema.parse>;
    const post = await prisma.post.create({
      data: { authorId: req.userId!, content },
      include: { author: { select: postAuthorSelect } },
    });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
});

postsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await findOwnedPost(id, req.userId!);
    await prisma.post.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
