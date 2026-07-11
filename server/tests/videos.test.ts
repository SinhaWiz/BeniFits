import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/youtube', () => ({
  searchVideos: vi.fn(),
}));

import { app } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { searchVideos } from '../src/lib/youtube';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Videos Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  vi.mocked(searchVideos).mockReset();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('video search', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/videos/search?q=HIIT');
    expect(res.status).toBe(401);
  });

  it('rejects a missing query param', async () => {
    const token = await registerAndGetToken('videos-missing-q@example.com');
    const res = await request(app)
      .get('/api/videos/search')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns results from the YouTube client', async () => {
    const token = await registerAndGetToken('videos-search@example.com');
    vi.mocked(searchVideos).mockResolvedValue([
      {
        videoId: 'abc123',
        title: 'HIIT Workout',
        description: 'A great workout.',
        thumbnailUrl: null,
        channelTitle: 'Fitness Channel',
        publishedAt: new Date().toISOString(),
        url: 'https://www.youtube.com/watch?v=abc123',
      },
    ]);

    const res = await request(app)
      .get('/api/videos/search?q=HIIT')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(searchVideos).toHaveBeenCalledWith('HIIT');
  });

  it('propagates a 503 when the API key is not configured', async () => {
    const token = await registerAndGetToken('videos-nokey@example.com');
    vi.mocked(searchVideos).mockRejectedValue(
      new AppError(503, 'Video search is not configured (missing YOUTUBE_API_KEY)'),
    );

    const res = await request(app)
      .get('/api/videos/search?q=HIIT')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
  });
});
