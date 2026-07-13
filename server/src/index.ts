import './instrument';
import { createServer } from 'http';
import { app } from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { attachSocket } from './lib/socket';

const port = process.env.PORT || 3001;

const httpServer = createServer(app);
attachSocket(httpServer);

httpServer.listen(port, () => {
  logger.info(`API server listening on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
