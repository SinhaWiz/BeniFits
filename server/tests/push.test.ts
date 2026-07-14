import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Push Test' });
  return res.body.accessToken as string;
}

const samplePayload = {
  endpoint: 'https://push.example.com/endpoint-abc',
  keys: { p256dh: 'fake-p256dh-key', auth: 'fake-auth-key' },
};

beforeEach(async () => {
  await prisma.pushSubscription.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.pushSubscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('web push', () => {
  it('reports disabled with no VAPID keys configured (test env)', async () => {
    const res = await request(app).get('/api/push/public-key');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: false, publicKey: null });
  });

  it('rejects unauthenticated subscribe requests', async () => {
    const res = await request(app).post('/api/push/subscribe').send(samplePayload);
    expect(res.status).toBe(401);
  });

  it('rejects a malformed subscription payload', async () => {
    const token = await registerAndGetToken('push-invalid@example.com');
    const res = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('subscribes, upserts by endpoint, and unsubscribes scoped to the owner', async () => {
    const token = await registerAndGetToken('push-subscribe@example.com');
    const otherToken = await registerAndGetToken('push-subscribe-other@example.com');

    const subscribeRes = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload);
    expect(subscribeRes.status).toBe(201);

    const resubscribeRes = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload);
    expect(resubscribeRes.status).toBe(201);

    const rows = await prisma.pushSubscription.findMany({
      where: { endpoint: samplePayload.endpoint },
    });
    expect(rows).toHaveLength(1);

    const otherUnsubscribe = await request(app)
      .delete('/api/push/subscribe')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ endpoint: samplePayload.endpoint });
    expect(otherUnsubscribe.status).toBe(204);

    const stillThere = await prisma.pushSubscription.findMany({
      where: { endpoint: samplePayload.endpoint },
    });
    expect(stillThere).toHaveLength(1);

    const ownUnsubscribe = await request(app)
      .delete('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint: samplePayload.endpoint });
    expect(ownUnsubscribe.status).toBe(204);

    const goneRows = await prisma.pushSubscription.findMany({
      where: { endpoint: samplePayload.endpoint },
    });
    expect(goneRows).toHaveLength(0);
  });
});
