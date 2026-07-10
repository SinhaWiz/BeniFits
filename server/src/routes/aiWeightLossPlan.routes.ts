import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/AppError';
import { CLAUDE_MODEL, getClaudeClient } from '../lib/claude';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  generateWeightLossPlanSchema,
  weightLossPlanOutputSchema,
} from '../schemas/aiWeightLossPlan.schema';

export const aiWeightLossPlanRouter = Router();
aiWeightLossPlanRouter.use(authenticate);

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const planInclude = { weeks: { orderBy: { weekNumber: 'asc' as const } } };

async function findOwnedPlan(id: string, userId: string) {
  const plan = await prisma.aiWeightLossPlan.findUnique({ where: { id }, include: planInclude });
  if (!plan || plan.userId !== userId) {
    throw new AppError(404, 'Weight-loss plan not found');
  }
  return plan;
}

function buildWeightLossUserPrompt(
  targetWeightKg: number,
  durationWeeks: number,
  healthProfile: {
    age: number | null;
    heightCm: number | null;
    weightKg: number | null;
    activityLevel: string | null;
    diseases: string[];
    allergies: string[];
  } | null,
): string {
  const profileLines = healthProfile
    ? [
        healthProfile.age ? `Age: ${healthProfile.age}` : null,
        healthProfile.heightCm ? `Height: ${healthProfile.heightCm}cm` : null,
        healthProfile.weightKg ? `Current weight: ${healthProfile.weightKg}kg` : null,
        healthProfile.activityLevel ? `Activity level: ${healthProfile.activityLevel}` : null,
        healthProfile.diseases.length > 0
          ? `Known conditions: ${healthProfile.diseases.join(', ')}`
          : null,
        healthProfile.allergies.length > 0
          ? `Allergies: ${healthProfile.allergies.join(', ')}`
          : null,
      ]
        .filter((line): line is string => line !== null)
        .join('\n')
    : 'No health profile on file.';

  return [
    `Create a ${durationWeeks}-week weight-loss plan.`,
    `Target weight: ${targetWeightKg}kg.`,
    '',
    'User profile:',
    profileLines,
    '',
    'For each week, give a target calorie count, target protein in grams, a short workout ' +
      'summary, a daily walking goal in minutes, a daily water goal in ml, and a sleep goal in ' +
      'hours. Make the plan gradual and realistic - do not recommend unsafe rapid weight loss. ' +
      'Include a brief overall summary and end it with a reminder to consult a doctor before ' +
      'starting any new diet or exercise program.',
  ].join('\n');
}

aiWeightLossPlanRouter.post(
  '/generate',
  generateLimiter,
  validateBody(generateWeightLossPlanSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      const claudeClient = getClaudeClient();
      const { targetWeightKg, durationWeeks } = req.body as ReturnType<
        typeof generateWeightLossPlanSchema.parse
      >;

      const healthProfile = await prisma.healthProfile.findUnique({ where: { userId } });
      const userPrompt = buildWeightLossUserPrompt(targetWeightKg, durationWeeks, healthProfile);

      const response = await claudeClient.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'high',
          format: zodOutputFormat(weightLossPlanOutputSchema),
        },
        messages: [{ role: 'user', content: userPrompt }],
      });

      if (!response.parsed_output) {
        throw new AppError(
          502,
          'The AI assistant returned an unexpected response. Please try again.',
        );
      }

      const { summary, weeks } = response.parsed_output;

      const plan = await prisma.aiWeightLossPlan.create({
        data: {
          userId,
          targetWeightKg,
          durationWeeks,
          summary,
          weeks: { create: weeks },
        },
        include: planInclude,
      });

      res.status(201).json({ plan });
    } catch (err) {
      next(err);
    }
  },
);

aiWeightLossPlanRouter.get('/', async (req, res, next) => {
  try {
    const plans = await prisma.aiWeightLossPlan.findMany({
      where: { userId: req.userId! },
      include: planInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

aiWeightLossPlanRouter.get('/:id', async (req, res, next) => {
  try {
    const plan = await findOwnedPlan(req.params.id, req.userId!);
    res.json({ plan });
  } catch (err) {
    next(err);
  }
});

aiWeightLossPlanRouter.delete('/:id', async (req, res, next) => {
  try {
    await findOwnedPlan(req.params.id, req.userId!);
    await prisma.aiWeightLossPlan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
