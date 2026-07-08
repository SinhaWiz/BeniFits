import { app } from './app';
import { prisma } from './lib/prisma';

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
