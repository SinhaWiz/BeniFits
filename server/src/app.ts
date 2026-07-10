import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import { prisma } from './lib/prisma';
import { errorHandler } from './middleware/errorHandler';
import { aiChatRouter } from './routes/aiChat.routes';
import { aiWeightLossPlanRouter } from './routes/aiWeightLossPlan.routes';
import { appointmentRouter } from './routes/appointment.routes';
import { authRouter } from './routes/auth.routes';
import { conversationRouter } from './routes/conversation.routes';
import { dietPlanRouter } from './routes/dietPlan.routes';
import { expertRouter } from './routes/expert.routes';
import { nutritionRouter } from './routes/nutrition.routes';
import { postsRouter } from './routes/posts.routes';
import { profileRouter } from './routes/profile.routes';
import { progressRouter } from './routes/progress.routes';
import { workoutPlanRouter } from './routes/workoutPlan.routes';

export const app = express();

app.use(express.json());
app.use(cookieParser());

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

app.use(errorHandler);
