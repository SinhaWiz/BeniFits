import 'dotenv/config';
import express from 'express';
import { prisma } from './lib/prisma';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

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

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
