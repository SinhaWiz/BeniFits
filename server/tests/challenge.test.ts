import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Challenge Test' });
  return res.body.accessToken as string;
}

function isoDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

let challengeId: string;

beforeAll(async () => {
  await prisma.challenge.deleteMany({ where: { title: 'Test Mood Challenge' } });
  const challenge = await prisma.challenge.create({
    data: {
      title: 'Test Mood Challenge',
      description: 'A test challenge for mood logs.',
      metric: 'MOOD_LOGS',
      startsAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });
  challengeId = challenge.id;
});

beforeEach(async () => {
  await prisma.challengeParticipant.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.challengeParticipant.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.challenge.deleteMany({ where: { title: 'Test Mood Challenge' } });
  await prisma.$disconnect();
});

describe('challenges', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/challenges');
    expect(res.status).toBe(401);
  });

  it('lists challenges with joined status and participant count', async () => {
    const token = await registerAndGetToken('challenge-list@example.com');
    const res = await request(app).get('/api/challenges').set('Authorization', `Bearer ${token}`);

    const challenge = res.body.challenges.find((c: { id: string }) => c.id === challengeId);
    expect(challenge.joined).toBe(false);
    expect(challenge.participantCount).toBe(0);
  });

  it('404s joining a nonexistent challenge', async () => {
    const token = await registerAndGetToken('challenge-404@example.com');
    const res = await request(app)
      .post('/api/challenges/nonexistent-id/join')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('joins, rejects a duplicate join, and computes leaderboard progress', async () => {
    const token = await registerAndGetToken('challenge-join@example.com');

    const joinRes = await request(app)
      .post(`/api/challenges/${challengeId}/join`)
      .set('Authorization', `Bearer ${token}`);
    expect(joinRes.status).toBe(201);

    const duplicateJoin = await request(app)
      .post(`/api/challenges/${challengeId}/join`)
      .set('Authorization', `Bearer ${token}`);
    expect(duplicateJoin.status).toBe(409);

    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: isoDateDaysAgo(0), moodScore: 4 });
    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: isoDateDaysAgo(1), moodScore: 3 });

    const leaderboardRes = await request(app)
      .get(`/api/challenges/${challengeId}/leaderboard`)
      .set('Authorization', `Bearer ${token}`);

    expect(leaderboardRes.body.leaderboard).toHaveLength(1);
    expect(leaderboardRes.body.leaderboard[0].progress).toBe(2);
    expect(leaderboardRes.body.leaderboard[0].rank).toBe(1);
  });

  it('leaves a challenge and 404s leaving again', async () => {
    const token = await registerAndGetToken('challenge-leave@example.com');
    await request(app)
      .post(`/api/challenges/${challengeId}/join`)
      .set('Authorization', `Bearer ${token}`);

    const leaveRes = await request(app)
      .delete(`/api/challenges/${challengeId}/join`)
      .set('Authorization', `Bearer ${token}`);
    expect(leaveRes.status).toBe(204);

    const secondLeave = await request(app)
      .delete(`/api/challenges/${challengeId}/join`)
      .set('Authorization', `Bearer ${token}`);
    expect(secondLeave.status).toBe(404);
  });
});
