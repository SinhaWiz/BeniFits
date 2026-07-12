import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Mood Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('mood tracking', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/mood');
    expect(res.status).toBe(401);
  });

  it('rejects an out-of-range mood score', async () => {
    const token = await registerAndGetToken('mood-invalid@example.com');
    const res = await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', moodScore: 9 });
    expect(res.status).toBe(400);
  });

  it('upserts by date', async () => {
    const token = await registerAndGetToken('mood-upsert@example.com');

    const createRes = await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', moodScore: 3, note: 'okay day' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.entry.moodScore).toBe(3);

    const upsertRes = await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', moodScore: 5 });
    expect(upsertRes.body.entry.id).toBe(createRes.body.entry.id);
    expect(upsertRes.body.entry.moodScore).toBe(5);

    const listRes = await request(app).get('/api/mood').set('Authorization', `Bearer ${token}`);
    expect(listRes.body.entries).toHaveLength(1);
  });

  it('filters by date range', async () => {
    const token = await registerAndGetToken('mood-range@example.com');
    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', moodScore: 4 });
    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-10', moodScore: 2 });

    const res = await request(app)
      .get('/api/mood?from=2026-01-05&to=2026-01-15')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].recordedAt.slice(0, 10)).toBe('2026-01-10');
  });

  it('deletes an entry and 404s for other users', async () => {
    const token = await registerAndGetToken('mood-delete@example.com');
    const otherToken = await registerAndGetToken('mood-delete-other@example.com');

    const createRes = await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', moodScore: 4 });
    const id = createRes.body.entry.id;

    const otherDelete = await request(app)
      .delete(`/api/mood/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherDelete.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/mood/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownDelete.status).toBe(204);
  });
});
