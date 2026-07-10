import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/AppError';
import { getTopHealthNews, searchNews } from '../lib/newsApi';
import { authenticate } from '../middleware/auth';
import { newsQuerySchema } from '../schemas/news.schema';

export const newsRouter = Router();
newsRouter.use(authenticate);

const newsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

newsRouter.get('/', newsLimiter, async (req, res, next) => {
  try {
    const parsed = newsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid query parameters');
    }

    const articles = parsed.data.q
      ? await searchNews(parsed.data.q)
      : await getTopHealthNews();

    res.json({ articles });
  } catch (err) {
    next(err);
  }
});
