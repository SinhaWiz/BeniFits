import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Profile Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await prisma.healthProfile.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.healthProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('health profile', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  it('returns null before a profile is created', async () => {
    const token = await registerAndGetToken('profile-null@example.com');

    const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeNull();
  });

  it('upserts a profile and computes BMI server-side', async () => {
    const token = await registerAndGetToken('profile-upsert@example.com');

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        age: 30,
        heightCm: 180,
        weightKg: 81,
        activityLevel: 'MODERATE',
        goal: 'LOSE_WEIGHT',
        diseases: ['hypertension'],
        allergies: [],
        foodPreferences: ['vegetarian'],
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.profile.bmi).toBe(25);
    expect(putRes.body.profile.diseases).toEqual(['hypertension']);

    const getRes = await request(app).get('/api/profile').set('Authorization', `Bearer ${token}`);
    expect(getRes.body.profile.bmi).toBe(25);
  });

  it('rejects out-of-range values', async () => {
    const token = await registerAndGetToken('profile-invalid@example.com');

    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ age: 999, heightCm: -5, diseases: [], allergies: [], foodPreferences: [] });

    expect(res.status).toBe(400);
  });
});
