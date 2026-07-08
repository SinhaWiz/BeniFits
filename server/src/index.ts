import express from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
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
