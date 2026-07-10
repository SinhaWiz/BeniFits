import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Expert Test' });
  return res.body.accessToken as string;
}

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'supersecret123' });
  return res.body.accessToken as string;
}

async function makeExpert(
  email: string,
  role: 'NUTRITIONIST' | 'DOCTOR' | 'COACH' = 'NUTRITIONIST',
): Promise<string> {
  await registerAndGetToken(email);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({ where: { id: user.id }, data: { role } });
  return loginAndGetToken(email);
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

describe('Expert directory API', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/experts');
    expect(res.status).toBe(401);
  });

  it('rejects profile creation for non-expert roles', async () => {
    const token = await registerAndGetToken('regular@example.com');
    const res = await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ specialty: 'Weight Management', focusArea: 'Fat loss', bio: 'Bio text' });
    expect(res.status).toBe(403);
  });

  it('lets an expert create and update their own profile', async () => {
    const token = await makeExpert('expert1@example.com', 'NUTRITIONIST');

    const createRes = await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        specialty: 'Weight Management',
        focusArea: 'Sustainable fat loss',
        bio: 'Ten years of experience.',
        yearsExperience: 10,
      });
    expect(createRes.status).toBe(200);
    expect(createRes.body.profile.specialty).toBe('Weight Management');

    const meRes = await request(app)
      .get('/api/experts/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.body.profile.focusArea).toBe('Sustainable fat loss');

    const updateRes = await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        specialty: 'Weight Management',
        focusArea: 'Updated focus',
        bio: 'Updated bio.',
        yearsExperience: 11,
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.profile.focusArea).toBe('Updated focus');
  });

  it('lists and searches experts by specialty and free text', async () => {
    const token1 = await makeExpert('expert2@example.com', 'DOCTOR');
    const token2 = await makeExpert('expert3@example.com', 'COACH');

    await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${token1}`)
      .send({ specialty: 'Sports Medicine', focusArea: 'Injury recovery', bio: 'Recovery bio.' });
    await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${token2}`)
      .send({ specialty: 'Strength Training', focusArea: 'Beginner lifting', bio: 'Lifting bio.' });

    const listRes = await request(app)
      .get('/api/experts')
      .set('Authorization', `Bearer ${token1}`);
    expect(listRes.body.experts).toHaveLength(2);

    const bySpecialty = await request(app)
      .get('/api/experts')
      .query({ specialty: 'Sports Medicine' })
      .set('Authorization', `Bearer ${token1}`);
    expect(bySpecialty.body.experts).toHaveLength(1);
    expect(bySpecialty.body.experts[0].specialty).toBe('Sports Medicine');

    const byQuery = await request(app)
      .get('/api/experts')
      .query({ q: 'lifting' })
      .set('Authorization', `Bearer ${token1}`);
    expect(byQuery.body.experts).toHaveLength(1);
    expect(byQuery.body.experts[0].specialty).toBe('Strength Training');
  });

  it('returns 404 for an unknown expert id', async () => {
    const token = await registerAndGetToken('viewer@example.com');
    const res = await request(app)
      .get('/api/experts/does-not-exist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('manages availability slots for the expert only', async () => {
    const expertToken = await makeExpert('expert4@example.com', 'NUTRITIONIST');
    const otherToken = await registerAndGetToken('notexpert@example.com');
    await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ specialty: 'Weight Management', focusArea: 'Fat loss', bio: 'Bio text' });

    const rejected = await request(app)
      .post('/api/experts/me/slots')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
      });
    expect(rejected.status).toBe(403);

    const pastSlot = await request(app)
      .post('/api/experts/me/slots')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({
        startsAt: new Date(Date.now() - 86400000).toISOString(),
        endsAt: new Date(Date.now() - 82800000).toISOString(),
      });
    expect(pastSlot.status).toBe(400);

    const createRes = await request(app)
      .post('/api/experts/me/slots')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
      });
    expect(createRes.status).toBe(201);
    const slotId = createRes.body.slot.id;

    const listRes = await request(app)
      .get('/api/experts/me/slots')
      .set('Authorization', `Bearer ${expertToken}`);
    expect(listRes.body.slots).toHaveLength(1);

    const deleteByOther = await request(app)
      .delete(`/api/experts/me/slots/${slotId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(deleteByOther.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/experts/me/slots/${slotId}`)
      .set('Authorization', `Bearer ${expertToken}`);
    expect(deleteRes.status).toBe(204);

    const afterDelete = await request(app)
      .get('/api/experts/me/slots')
      .set('Authorization', `Bearer ${expertToken}`);
    expect(afterDelete.body.slots).toHaveLength(0);
  });
});
