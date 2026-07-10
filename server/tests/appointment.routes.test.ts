import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Appointment Test' });
  return res.body.accessToken as string;
}

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'supersecret123' });
  return res.body.accessToken as string;
}

async function makeExpertWithProfile(email: string): Promise<string> {
  await registerAndGetToken(email);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({ where: { id: user.id }, data: { role: 'NUTRITIONIST' } });
  const token = await loginAndGetToken(email);
  await request(app)
    .put('/api/experts/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ specialty: 'Weight Management', focusArea: 'Fat loss', bio: 'Bio text' });
  return token;
}

async function createSlot(expertToken: string, offsetMs = 86400000): Promise<string> {
  const res = await request(app)
    .post('/api/experts/me/slots')
    .set('Authorization', `Bearer ${expertToken}`)
    .send({
      startsAt: new Date(Date.now() + offsetMs).toISOString(),
      endsAt: new Date(Date.now() + offsetMs + 3600000).toISOString(),
    });
  return res.body.slot.id as string;
}

async function cleanup() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.expertProfile.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Appointment booking API', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });

  it('books an open slot and lists it for both client and expert', async () => {
    const expertToken = await makeExpertWithProfile('bookexpert1@example.com');
    const clientToken = await registerAndGetToken('bookclient1@example.com');
    const slotId = await createSlot(expertToken);

    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ slotId, notes: 'First session' });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body.appointment.status).toBe('PENDING');
    expect(bookRes.body.appointment.slot.status).toBe('BOOKED');

    const clientList = await request(app)
      .get('/api/appointments')
      .query({ role: 'client' })
      .set('Authorization', `Bearer ${clientToken}`);
    expect(clientList.body.appointments).toHaveLength(1);

    const expertList = await request(app)
      .get('/api/appointments')
      .query({ role: 'expert' })
      .set('Authorization', `Bearer ${expertToken}`);
    expect(expertList.body.appointments).toHaveLength(1);
  });

  it('prevents double-booking under concurrent requests', async () => {
    const expertToken = await makeExpertWithProfile('bookexpert2@example.com');
    const client1Token = await registerAndGetToken('bookclient2@example.com');
    const client2Token = await registerAndGetToken('bookclient3@example.com');
    const slotId = await createSlot(expertToken);

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${client1Token}`)
        .send({ slotId }),
      request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${client2Token}`)
        .send({ slotId }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('enforces the status transition rules and reopens the slot on cancellation', async () => {
    const expertToken = await makeExpertWithProfile('bookexpert3@example.com');
    const clientToken = await registerAndGetToken('bookclient4@example.com');
    const slotId = await createSlot(expertToken);

    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ slotId });
    const appointmentId = bookRes.body.appointment.id;

    const clientConfirmAttempt = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'CONFIRMED' });
    expect(clientConfirmAttempt.status).toBe(403);

    const otherUserToken = await registerAndGetToken('stranger@example.com');
    const strangerAttempt = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ status: 'CANCELLED' });
    expect(strangerAttempt.status).toBe(404);

    const cancelRes = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'CANCELLED' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.appointment.status).toBe('CANCELLED');

    const slot = await prisma.availabilitySlot.findUniqueOrThrow({ where: { id: slotId } });
    expect(slot.status).toBe('OPEN');

    const cancelAgain = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'CANCELLED' });
    expect(cancelAgain.status).toBe(409);
  });

  it('lets the expert confirm and complete an appointment', async () => {
    const expertToken = await makeExpertWithProfile('bookexpert4@example.com');
    const clientToken = await registerAndGetToken('bookclient5@example.com');
    const slotId = await createSlot(expertToken);

    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ slotId });
    const appointmentId = bookRes.body.appointment.id;

    const completeTooEarly = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ status: 'COMPLETED' });
    expect(completeTooEarly.status).toBe(409);

    const confirmRes = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ status: 'CONFIRMED' });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.appointment.status).toBe('CONFIRMED');

    const completeRes = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ status: 'COMPLETED' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.appointment.status).toBe('COMPLETED');
  });

  it('allows rebooking a slot after a previous booking on it was cancelled', async () => {
    const expertToken = await makeExpertWithProfile('bookexpert5@example.com');
    const client1Token = await registerAndGetToken('bookclient6@example.com');
    const client2Token = await registerAndGetToken('bookclient7@example.com');
    const slotId = await createSlot(expertToken);

    const firstBooking = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${client1Token}`)
      .send({ slotId });
    expect(firstBooking.status).toBe(201);

    await request(app)
      .patch(`/api/appointments/${firstBooking.body.appointment.id}`)
      .set('Authorization', `Bearer ${client1Token}`)
      .send({ status: 'CANCELLED' });

    const secondBooking = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${client2Token}`)
      .send({ slotId });
    expect(secondBooking.status).toBe(201);
  });
});
