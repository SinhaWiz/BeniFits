import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Meditation Test' });
  return res.body.accessToken as string;
}

let breathingSessionId: string;
let sleepSessionId: string;

beforeAll(async () => {
  await prisma.meditationSession.deleteMany({ where: { title: { startsWith: 'Test Meditation' } } });
  const breathing = await prisma.meditationSession.create({
    data: {
      title: 'Test Meditation Breathing',
      category: 'BREATHING',
      durationMinutes: 5,
      description: 'A test breathing session.',
    },
  });
  const sleep = await prisma.meditationSession.create({
    data: {
      title: 'Test Meditation Sleep',
      category: 'SLEEP',
      durationMinutes: 15,
      description: 'A test sleep session.',
    },
  });
  breathingSessionId = breathing.id;
  sleepSessionId = sleep.id;
});

beforeEach(async () => {
  await prisma.meditationLog.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.meditationLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.meditationSession.deleteMany({ where: { title: { startsWith: 'Test Meditation' } } });
  await prisma.$disconnect();
});

describe('meditation', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/meditation/sessions');
    expect(res.status).toBe(401);
  });

  it('lists sessions and filters by category', async () => {
    const token = await registerAndGetToken('meditation-sessions@example.com');
    const all = await request(app)
      .get('/api/meditation/sessions')
      .set('Authorization', `Bearer ${token}`);
    expect(all.body.sessions.length).toBeGreaterThanOrEqual(2);

    const filtered = await request(app)
      .get('/api/meditation/sessions?category=SLEEP')
      .set('Authorization', `Bearer ${token}`);
    expect(filtered.body.sessions.every((s: { category: string }) => s.category === 'SLEEP')).toBe(
      true,
    );

    const invalid = await request(app)
      .get('/api/meditation/sessions?category=BOGUS')
      .set('Authorization', `Bearer ${token}`);
    expect(invalid.status).toBe(400);
  });

  it('logs a completed session defaulting to the session duration', async () => {
    const token = await registerAndGetToken('meditation-log@example.com');
    const res = await request(app)
      .post('/api/meditation/logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: breathingSessionId, completedOn: '2026-01-01' });

    expect(res.status).toBe(201);
    expect(res.body.log.durationMinutes).toBe(5);
    expect(res.body.log.session.title).toBe('Test Meditation Breathing');
  });

  it('allows multiple logs on the same day', async () => {
    const token = await registerAndGetToken('meditation-multi@example.com');
    await request(app)
      .post('/api/meditation/logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: breathingSessionId, completedOn: '2026-01-01' });
    await request(app)
      .post('/api/meditation/logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: sleepSessionId, completedOn: '2026-01-01', durationMinutes: 10 });

    const listRes = await request(app)
      .get('/api/meditation/logs')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.logs).toHaveLength(2);
  });

  it('404s when logging a nonexistent session', async () => {
    const token = await registerAndGetToken('meditation-invalid-session@example.com');
    const res = await request(app)
      .post('/api/meditation/logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 'nonexistent-id', completedOn: '2026-01-01' });

    expect(res.status).toBe(404);
  });

  it('deletes a log and 404s for other users', async () => {
    const token = await registerAndGetToken('meditation-delete@example.com');
    const otherToken = await registerAndGetToken('meditation-delete-other@example.com');

    const createRes = await request(app)
      .post('/api/meditation/logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: breathingSessionId, completedOn: '2026-01-01' });
    const id = createRes.body.log.id;

    const otherDelete = await request(app)
      .delete(`/api/meditation/logs/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherDelete.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/meditation/logs/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownDelete.status).toBe(204);
  });
});
