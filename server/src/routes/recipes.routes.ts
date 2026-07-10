import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/AppError';
import { getRecipeDetail, searchRecipes } from '../lib/spoonacular';
import { authenticate } from '../middleware/auth';
import { recipesSearchQuerySchema } from '../schemas/recipes.schema';

export const recipesRouter = Router();
recipesRouter.use(authenticate);

const recipesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

recipesRouter.get('/search', recipesLimiter, async (req, res, next) => {
  try {
    const parsed = recipesSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'q query parameter is required');
    }

    const results = await searchRecipes(parsed.data.q);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

recipesRouter.get('/:id', recipesLimiter, async (req, res, next) => {
  try {
    const recipe = await getRecipeDetail(req.params.id as string);
    res.json({ recipe });
  } catch (err) {
    next(err);
  }
});
