import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Sleep Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await prisma.sleepEntry.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.sleepEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('sleep tools', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/sleep');
    expect(res.status).toBe(401);
  });

  it('computes duration from bedtime and wake time', async () => {
    const token = await registerAndGetToken('sleep-duration@example.com');
    const res = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recordedAt: '2026-01-02',
        bedtime: '2026-01-01T23:00:00.000Z',
        wakeTime: '2026-01-02T07:30:00.000Z',
        qualityRating: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.entry.durationMinutes).toBe(510);
  });

  it('rejects a wakeTime at or before bedtime', async () => {
    const token = await registerAndGetToken('sleep-invalid@example.com');
    const res = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recordedAt: '2026-01-02',
        bedtime: '2026-01-02T23:00:00.000Z',
        wakeTime: '2026-01-02T22:00:00.000Z',
      });

    expect(res.status).toBe(400);
  });

  it('upserts by date', async () => {
    const token = await registerAndGetToken('sleep-upsert@example.com');
    const createRes = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recordedAt: '2026-01-01',
        bedtime: '2025-12-31T23:00:00.000Z',
        wakeTime: '2026-01-01T06:00:00.000Z',
      });

    const upsertRes = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recordedAt: '2026-01-01',
        bedtime: '2025-12-31T22:00:00.000Z',
        wakeTime: '2026-01-01T07:00:00.000Z',
      });

    expect(upsertRes.body.entry.id).toBe(createRes.body.entry.id);
    expect(upsertRes.body.entry.durationMinutes).toBe(540);

    const listRes = await request(app).get('/api/sleep').set('Authorization', `Bearer ${token}`);
    expect(listRes.body.entries).toHaveLength(1);
  });

  it('deletes an entry and 404s for other users', async () => {
    const token = await registerAndGetToken('sleep-delete@example.com');
    const otherToken = await registerAndGetToken('sleep-delete-other@example.com');

    const createRes = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recordedAt: '2026-01-01',
        bedtime: '2025-12-31T23:00:00.000Z',
        wakeTime: '2026-01-01T06:00:00.000Z',
      });
    const id = createRes.body.entry.id;

    const otherDelete = await request(app)
      .delete(`/api/sleep/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherDelete.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/sleep/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownDelete.status).toBe(204);
  });

  it('round-trips a sleep goal on the health profile', async () => {
    const token = await registerAndGetToken('sleep-goal@example.com');
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ sleepGoalHours: 8, diseases: [], allergies: [], foodPreferences: [] });

    expect(res.status).toBe(200);
    expect(res.body.profile.sleepGoalHours).toBe(8);
  });
});
