import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/pubmed', () => ({
  searchResearch: vi.fn(),
}));

import { app } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { searchResearch } from '../src/lib/pubmed';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Research Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  vi.mocked(searchResearch).mockReset();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('research summaries', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/research/search?q=exercise');
    expect(res.status).toBe(401);
  });

  it('rejects a missing query param', async () => {
    const token = await registerAndGetToken('research-missing-q@example.com');
    const res = await request(app)
      .get('/api/research/search')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns results from the PubMed client', async () => {
    const token = await registerAndGetToken('research-search@example.com');
    vi.mocked(searchResearch).mockResolvedValue([
      {
        pmid: '123',
        title: 'A study on exercise',
        journal: 'Journal of Testing',
        authors: ['Jane Doe'],
        year: '2020',
        abstract: 'This study found things.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/123/',
      },
    ]);

    const res = await request(app)
      .get('/api/research/search?q=exercise')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(searchResearch).toHaveBeenCalledWith('exercise');
  });

  it('propagates errors from the PubMed client', async () => {
    const token = await registerAndGetToken('research-error@example.com');
    vi.mocked(searchResearch).mockRejectedValue(
      new AppError(502, 'Unable to reach the PubMed service'),
    );

    const res = await request(app)
      .get('/api/research/search?q=exercise')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(502);
  });
});
