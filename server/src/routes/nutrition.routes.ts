import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { getFoodDetail, searchFoods } from '../lib/usda';
import { authenticate } from '../middleware/auth';
import { nutritionSearchQuerySchema } from '../schemas/nutrition.schema';

export const nutritionRouter = Router();
nutritionRouter.use(authenticate);

nutritionRouter.get('/search', async (req, res, next) => {
  try {
    const parsed = nutritionSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'q query parameter is required');
    }

    const results = await searchFoods(parsed.data.q);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

nutritionRouter.get('/foods/:fdcId', async (req, res, next) => {
  try {
    const food = await getFoodDetail(req.params.fdcId);
    res.json({ food });
  } catch (err) {
    next(err);
  }
});
