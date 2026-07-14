import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('Prometheus metrics', () => {
  it('exposes /api/metrics without authentication', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toMatch(/# HELP http_request_duration_seconds/);
    expect(res.text).toMatch(/# HELP process_cpu_user_seconds_total/);
  });

  it('is not throttled by the global rate limiter', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.headers['ratelimit-limit']).toBeUndefined();
  });
});
