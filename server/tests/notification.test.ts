import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Notification Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await prisma.notification.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.notification.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('notifications', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('lists notifications created by other flows, e.g. a badge award', async () => {
    const token = await registerAndGetToken('notif-list@example.com');

    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', moodScore: 4 });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.unreadCount).toBe(1);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].type).toBe('BADGE_EARNED');
    expect(res.body.notifications[0].read).toBe(false);
  });

  it('marks a single notification as read and 404s for other users', async () => {
    const token = await registerAndGetToken('notif-read@example.com');
    const otherToken = await registerAndGetToken('notif-read-other@example.com');

    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', moodScore: 4 });

    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    const notificationId = listRes.body.notifications[0].id;

    const otherRead = await request(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherRead.status).toBe(404);

    const ownRead = await request(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownRead.status).toBe(200);
    expect(ownRead.body.notification.read).toBe(true);
  });

  it('marks all notifications as read', async () => {
    const token = await registerAndGetToken('notif-read-all@example.com');

    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-01', moodScore: 4 });
    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-02', moodScore: 4 });
    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${token}`)
      .send({ recordedAt: '2026-01-03', moodScore: 4 });

    const readAllRes = await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(readAllRes.status).toBe(204);

    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.unreadCount).toBe(0);
  });
});
