import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createCommentSchema } from '../schemas/comment.schema';
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

function postWithMetaInclude(userId: string) {
  return {
    author: { select: postAuthorSelect },
    _count: { select: { likes: true, comments: true } },
    likes: { where: { userId }, select: { id: true } },
  } as const;
}

function serializePost<
  T extends { _count: { likes: number; comments: number }; likes: unknown[] },
>(post: T) {
  const { _count, likes, ...rest } = post;
  return { ...rest, likesCount: _count.likes, commentsCount: _count.comments, likedByMe: likes.length > 0 };
}

async function findOwnedPost(id: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.authorId !== userId) {
    throw new AppError(404, 'Post not found');
  }
  return post;
}

async function findExistingPost(id: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    throw new AppError(404, 'Post not found');
  }
  return post;
}

async function findOwnedComment(id: string, postId: string, userId: string) {
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment || comment.postId !== postId || comment.authorId !== userId) {
    throw new AppError(404, 'Comment not found');
  }
  return comment;
}

postsRouter.get('/', async (req, res, next) => {
  try {
    const { authorId } = req.query;
    const take = parseTake(req.query.take);
    const skip = parseSkip(req.query.skip);
    const userId = req.userId!;

    const where: Record<string, unknown> = {};
    if (typeof authorId === 'string' && authorId.length > 0) {
      where.authorId = authorId;
    }

    const posts = await prisma.post.findMany({
      where,
      include: postWithMetaInclude(userId),
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      skip,
    });

    const hasMore = posts.length > take;
    res.json({ posts: posts.slice(0, take).map(serializePost), hasMore });
  } catch (err) {
    next(err);
  }
});

postsRouter.post('/', validateBody(createPostSchema), async (req, res, next) => {
  try {
    const { content } = req.body as ReturnType<typeof createPostSchema.parse>;
    const userId = req.userId!;
    const post = await prisma.post.create({
      data: { authorId: userId, content },
      include: postWithMetaInclude(userId),
    });
    res.status(201).json({ post: serializePost(post) });
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

postsRouter.post('/:id/like', async (req, res, next) => {
  try {
    const postId = req.params.id as string;
    const userId = req.userId!;
    await findExistingPost(postId);

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      throw new AppError(409, 'Post already liked');
    }

    await prisma.postLike.create({ data: { postId, userId } });
    res.status(201).send();
  } catch (err) {
    next(err);
  }
});

postsRouter.delete('/:id/like', async (req, res, next) => {
  try {
    const postId = req.params.id as string;
    const userId = req.userId!;

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      throw new AppError(404, 'Like not found');
    }

    await prisma.postLike.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

postsRouter.get('/:id/comments', async (req, res, next) => {
  try {
    const postId = req.params.id as string;
    const take = parseTake(req.query.take);
    const skip = parseSkip(req.query.skip);
    await findExistingPost(postId);

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: { author: { select: postAuthorSelect } },
      orderBy: { createdAt: 'asc' },
      take: take + 1,
      skip,
    });

    const hasMore = comments.length > take;
    res.json({ comments: comments.slice(0, take), hasMore });
  } catch (err) {
    next(err);
  }
});

postsRouter.post(
  '/:id/comments',
  validateBody(createCommentSchema),
  async (req, res, next) => {
    try {
      const postId = req.params.id as string;
      const { content } = req.body as ReturnType<typeof createCommentSchema.parse>;
      await findExistingPost(postId);

      const comment = await prisma.comment.create({
        data: { postId, authorId: req.userId!, content },
        include: { author: { select: postAuthorSelect } },
      });
      res.status(201).json({ comment });
    } catch (err) {
      next(err);
    }
  },
);

postsRouter.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const postId = req.params.id as string;
    const commentId = req.params.commentId as string;
    await findOwnedComment(commentId, postId, req.userId!);
    await prisma.comment.delete({ where: { id: commentId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
