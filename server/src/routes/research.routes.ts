import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/AppError';
import { searchResearch } from '../lib/pubmed';
import { authenticate } from '../middleware/auth';
import { researchSearchQuerySchema } from '../schemas/research.schema';

export const researchRouter = Router();
researchRouter.use(authenticate);

const researchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

researchRouter.get('/search', researchLimiter, async (req, res, next) => {
  try {
    const parsed = researchSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'q query parameter is required');
    }

    const results = await searchResearch(parsed.data.q);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});
