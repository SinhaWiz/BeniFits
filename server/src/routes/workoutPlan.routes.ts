import { Router } from 'express';
import { AppError } from '../errors/AppError';
import {
  categoryRotationForGoal,
  difficultyForActivityLevel,
  EXERCISES_PER_DAY,
} from '../lib/workoutGenerator';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { generateWorkoutPlanSchema } from '../schemas/workoutPlan.schema';

export const workoutPlanRouter = Router();
workoutPlanRouter.use(authenticate);

const planInclude = {
  days: {
    include: { exercises: { include: { exercise: true } } },
    orderBy: { dayNumber: 'asc' as const },
  },
};

async function findOwnedPlan(id: string, userId: string) {
  const plan = await prisma.workoutPlan.findUnique({ where: { id }, include: planInclude });
  if (!plan || plan.userId !== userId) {
    throw new AppError(404, 'Workout plan not found');
  }
  return plan;
}

workoutPlanRouter.post(
  '/generate',
  validateBody(generateWorkoutPlanSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { title } = req.body as ReturnType<typeof generateWorkoutPlanSchema.parse>;

      const healthProfile = await prisma.healthProfile.findUnique({ where: { userId } });
      const difficulty = difficultyForActivityLevel(healthProfile?.activityLevel);
      const rotation = categoryRotationForGoal(healthProfile?.goal);

      const allExercises = await prisma.exercise.findMany();
      if (allExercises.length === 0) {
        throw new AppError(503, 'Exercise library is empty; run the seed script first');
      }

      const days = rotation.map((category, index) => {
        if (category === 'REST') {
          return { dayNumber: index + 1, category, exercises: [] as typeof allExercises };
        }
        const matching = allExercises.filter(
          (exercise) => exercise.category === category && exercise.difficulty === difficulty,
        );
        const pool =
          matching.length > 0
            ? matching
            : allExercises.filter((exercise) => exercise.category === category);
        return { dayNumber: index + 1, category, exercises: pool.slice(0, EXERCISES_PER_DAY) };
      });

      const plan = await prisma.workoutPlan.create({
        data: {
          userId,
          title: title ?? `Weekly plan (${difficulty.toLowerCase()})`,
          days: {
            create: days.map((day) => ({
              dayNumber: day.dayNumber,
              category: day.category,
              exercises: {
                create: day.exercises.map((exercise) => ({
                  exerciseId: exercise.id,
                  sets: exercise.defaultSets,
                  reps: exercise.defaultReps,
                  durationMinutes: exercise.durationMinutes,
                })),
              },
            })),
          },
        },
        include: planInclude,
      });

      res.status(201).json({ plan });
    } catch (err) {
      next(err);
    }
  },
);

workoutPlanRouter.get('/', async (req, res, next) => {
  try {
    const plans = await prisma.workoutPlan.findMany({
      where: { userId: req.userId! },
      include: planInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

workoutPlanRouter.get('/:id', async (req, res, next) => {
  try {
    const plan = await findOwnedPlan(req.params.id, req.userId!);
    res.json({ plan });
  } catch (err) {
    next(err);
  }
});

workoutPlanRouter.delete('/:id', async (req, res, next) => {
  try {
    await findOwnedPlan(req.params.id, req.userId!);
    await prisma.workoutPlan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
