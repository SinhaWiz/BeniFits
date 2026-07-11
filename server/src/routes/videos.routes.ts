import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/AppError';
import { searchVideos } from '../lib/youtube';
import { authenticate } from '../middleware/auth';
import { videosSearchQuerySchema } from '../schemas/videos.schema';

export const videosRouter = Router();
videosRouter.use(authenticate);

// YouTube's free quota is the tightest of the four content APIs (a search
// costs 100 of the default 10,000 daily quota units), so this gets the
// strictest per-user limit.
const videosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

videosRouter.get('/search', videosLimiter, async (req, res, next) => {
  try {
    const parsed = videosSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'q query parameter is required');
    }

    const results = await searchVideos(parsed.data.q);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});
