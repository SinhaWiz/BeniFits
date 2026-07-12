import { Router } from 'express';
import { BADGE_DEFINITIONS, getWellnessCounts } from '../lib/gamification';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const gamificationRouter = Router();
gamificationRouter.use(authenticate);

gamificationRouter.get('/summary', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const [counts, earned] = await Promise.all([
      getWellnessCounts(userId),
      prisma.userBadge.findMany({ where: { userId } }),
    ]);

    const earnedByKey = new Map(earned.map((badge) => [badge.badgeKey, badge.earnedAt]));
    const badges = BADGE_DEFINITIONS.map((badge) => ({
      key: badge.key,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned: earnedByKey.has(badge.key),
      earnedAt: earnedByKey.get(badge.key) ?? null,
    }));

    res.json({
      streak: counts.currentStreak,
      counts: {
        moodCount: counts.moodCount,
        sleepCount: counts.sleepCount,
        meditationCount: counts.meditationCount,
      },
      badges,
    });
  } catch (err) {
    next(err);
  }
});
