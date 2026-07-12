import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Gamification Test' });
  return res.body.accessToken as string;
}

function isoDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

let meditationSessionId: string;

beforeAll(async () => {
  await prisma.meditationSession.deleteMany({ where: { title: 'Test Gamification Session' } });
  const session = await prisma.meditationSession.create({
    data: {
      title: 'Test Gamification Session',
      category: 'FOCUS',
      durationMinutes: 5,
      description: 'A test session for gamification.',
    },
  });
  meditationSessionId = session.id;
});

beforeEach(async () => {
  await prisma.userBadge.deleteMany();
  await prisma.meditationLog.deleteMany();
  await prisma.sleepEntry.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.userBadge.deleteMany();
  await prisma.meditationLog.deleteMany();
  await prisma.sleepEntry.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.meditationSession.deleteMany({ where: { title: 'Test Gamification Session' } });
  await prisma.$disconnect();
});

describe('gamification', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/gamification/summary');
    expect(res.status).toBe(401);
  });

  it('awards the first-step badge on the first ever wellness log', async () => {
    const token = await registerAndGetToken('gamification-first-step@example.com');
    const res = await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: isoDateDaysAgo(0), moodScore: 4 });

    expect(res.body.newBadges.map((b: { key: string }) => b.key)).toContain('first-step');
  });

  it('builds a streak across mood entries on consecutive days and awards streak-3', async () => {
    const token = await registerAndGetToken('gamification-streak@example.com');

    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: isoDateDaysAgo(2), moodScore: 3 });
    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: isoDateDaysAgo(1), moodScore: 3 });
    const thirdRes = await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: isoDateDaysAgo(0), moodScore: 3 });

    expect(thirdRes.body.newBadges.map((b: { key: string }) => b.key)).toContain('streak-3');

    const summary = await request(app)
      .get('/api/gamification/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(summary.body.streak).toBe(3);
    expect(summary.body.counts.moodCount).toBe(3);
    expect(
      summary.body.badges.find((b: { key: string }) => b.key === 'streak-3').earned,
    ).toBe(true);
    expect(
      summary.body.badges.find((b: { key: string }) => b.key === 'streak-7').earned,
    ).toBe(false);
  });

  it('awards well-rounded after using mood, sleep, and meditation', async () => {
    const token = await registerAndGetToken('gamification-well-rounded@example.com');
    const today = isoDateDaysAgo(0);

    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: today, moodScore: 4 });
    await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recordedAt: today,
        bedtime: '2026-01-01T23:00:00.000Z',
        wakeTime: '2026-01-02T06:00:00.000Z',
      });
    const meditationRes = await request(app)
      .post('/api/meditation/logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: meditationSessionId, completedOn: today });

    expect(meditationRes.body.newBadges.map((b: { key: string }) => b.key)).toContain(
      'well-rounded',
    );
  });

  it('does not re-award an already-earned badge', async () => {
    const token = await registerAndGetToken('gamification-no-dup@example.com');
    const first = await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: isoDateDaysAgo(0), moodScore: 4 });
    expect(first.body.newBadges.map((b: { key: string }) => b.key)).toContain('first-step');

    const secondSummary = await request(app)
      .get('/api/gamification/summary')
      .set('Authorization', `Bearer ${token}`);
    const firstStepBadges = secondSummary.body.badges.filter(
      (b: { key: string }) => b.key === 'first-step',
    );
    expect(firstStepBadges).toHaveLength(1);
  });
});
