import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/newsApi', () => ({
  getTopHealthNews: vi.fn(),
  searchNews: vi.fn(),
}));

import { app } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { getTopHealthNews, searchNews } from '../src/lib/newsApi';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'News Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  vi.mocked(getTopHealthNews).mockReset();
  vi.mocked(searchNews).mockReset();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('health news', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/news');
    expect(res.status).toBe(401);
  });

  it('returns the default feed when no query is given', async () => {
    const token = await registerAndGetToken('news-default@example.com');
    vi.mocked(getTopHealthNews).mockResolvedValue([
      {
        title: 'Health headline',
        description: null,
        url: 'https://example.com/a',
        imageUrl: null,
        source: 'Example',
        publishedAt: new Date().toISOString(),
      },
    ]);

    const res = await request(app).get('/api/news').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(1);
    expect(getTopHealthNews).toHaveBeenCalled();
    expect(searchNews).not.toHaveBeenCalled();
  });

  it('searches when a query is given', async () => {
    const token = await registerAndGetToken('news-search@example.com');
    vi.mocked(searchNews).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/news?q=nutrition')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(searchNews).toHaveBeenCalledWith('nutrition');
    expect(getTopHealthNews).not.toHaveBeenCalled();
  });

  it('propagates a 503 when the API key is not configured', async () => {
    const token = await registerAndGetToken('news-nokey@example.com');
    vi.mocked(getTopHealthNews).mockRejectedValue(
      new AppError(503, 'Health news is not configured (missing NEWS_API_KEY)'),
    );

    const res = await request(app).get('/api/news').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
  });
});
