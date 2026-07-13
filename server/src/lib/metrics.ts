import type { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const endTimer = httpRequestDurationSeconds.startTimer();

  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : `${req.baseUrl || 'unmatched'}`;
    endTimer({ method: req.method, route, status_code: res.statusCode });
  });

  next();
}
