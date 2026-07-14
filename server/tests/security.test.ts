import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('security hardening', () => {
  it('sets standard helmet security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('allows CORS for the configured origin', async () => {
    const res = await request(app)
      .options('/api/mood')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not echo an unlisted origin', async () => {
    const res = await request(app)
      .options('/api/mood')
      .set('Origin', 'http://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('exposes global rate-limit headers on a normal API route', async () => {
    const res = await request(app).get('/api/mood');
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('skips the global rate limiter for /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['ratelimit-limit']).toBeUndefined();
  });
});
