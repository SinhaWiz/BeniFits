import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Progress Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await prisma.progressEntry.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.progressEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('progress tracking', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/progress');
    expect(res.status).toBe(401);
  });

  it('upserts by date and computes BMI from the health profile', async () => {
    const token = await registerAndGetToken('progress-upsert@example.com');
    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ heightCm: 180, diseases: [], allergies: [], foodPreferences: [] });

    const createRes = await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', weightKg: 90 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.entry.bmi).toBe(27.8);

    const upsertRes = await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', weightKg: 88 });
    expect(upsertRes.body.entry.id).toBe(createRes.body.entry.id);
    expect(upsertRes.body.entry.bmi).toBe(27.2);

    const listRes = await request(app).get('/api/progress').set('Authorization', `Bearer ${token}`);
    expect(listRes.body.entries).toHaveLength(1);
  });

  it('filters by date range', async () => {
    const token = await registerAndGetToken('progress-range@example.com');
    await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', weightKg: 80 });
    await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-10', weightKg: 79 });

    const res = await request(app)
      .get('/api/progress?from=2026-01-05&to=2026-01-15')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].recordedAt.slice(0, 10)).toBe('2026-01-10');
  });

  it('deletes an entry and 404s for other users', async () => {
    const token = await registerAndGetToken('progress-delete@example.com');
    const otherToken = await registerAndGetToken('progress-delete-other@example.com');

    const createRes = await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', weightKg: 70 });
    const id = createRes.body.entry.id;

    const otherDelete = await request(app)
      .delete(`/api/progress/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherDelete.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/progress/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownDelete.status).toBe(204);
  });
});
