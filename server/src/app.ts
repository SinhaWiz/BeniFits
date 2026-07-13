import 'dotenv/config';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { metricsMiddleware, metricsRegistry } from './lib/metrics';
import { prisma } from './lib/prisma';
import { isSentryEnabled } from './lib/sentry';
import { errorHandler } from './middleware/errorHandler';
import { aiChatRouter } from './routes/aiChat.routes';
import { aiWeightLossPlanRouter } from './routes/aiWeightLossPlan.routes';
import { appointmentRouter } from './routes/appointment.routes';
import { challengeRouter } from './routes/challenge.routes';
import { authRouter } from './routes/auth.routes';
import { conversationRouter } from './routes/conversation.routes';
import { dietPlanRouter } from './routes/dietPlan.routes';
import { expertRouter } from './routes/expert.routes';
import { gamificationRouter } from './routes/gamification.routes';
import { meditationRouter } from './routes/meditation.routes';
import { moodRouter } from './routes/mood.routes';
import { newsRouter } from './routes/news.routes';
import { notificationRouter } from './routes/notification.routes';
import { nutritionRouter } from './routes/nutrition.routes';
import { postsRouter } from './routes/posts.routes';
import { profileRouter } from './routes/profile.routes';
import { progressRouter } from './routes/progress.routes';
import { pushRouter } from './routes/push.routes';
import { recipesRouter } from './routes/recipes.routes';
import { researchRouter } from './routes/research.routes';
import { sleepRouter } from './routes/sleep.routes';
import { usersRouter } from './routes/users.routes';
import { videosRouter } from './routes/videos.routes';
import { workoutPlanRouter } from './routes/workoutPlan.routes';

export const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(pinoHttp({ logger }));
app.use(metricsMiddleware);
app.use(express.json());
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/metrics') return next();
  return globalLimiter(req, res, next);
});

app.get('/api/metrics', async (_req, res, next) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', async (_req, res) => {
  let dbConnected = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbConnected = false;
  }

  res.json({
    ok: true,
    dbConnected,
    message: 'API is healthy and ready for fullstack development.',
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'BeniHealth API',
    status: 'running',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/progress', progressRouter);
app.use('/api/nutrition', nutritionRouter);
app.use('/api/diet-plans', dietPlanRouter);
app.use('/api/workout-plans', workoutPlanRouter);
app.use('/api/ai/chat', aiChatRouter);
app.use('/api/ai/weight-loss-plans', aiWeightLossPlanRouter);
app.use('/api/experts', expertRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/posts', postsRouter);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/news', newsRouter);
app.use('/api/research', researchRouter);
app.use('/api/videos', videosRouter);
app.use('/api/mood', moodRouter);
app.use('/api/sleep', sleepRouter);
app.use('/api/meditation', meditationRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/challenges', challengeRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/push', pushRouter);

if (isSentryEnabled()) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(errorHandler);
