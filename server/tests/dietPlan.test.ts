import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Diet Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await prisma.dietPlanMeal.deleteMany();
  await prisma.dietPlan.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.dietPlanMeal.deleteMany();
  await prisma.dietPlan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('diet plans', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/diet-plans');
    expect(res.status).toBe(401);
  });

  it('creates a plan and computes totals from its meals', async () => {
    const token = await registerAndGetToken('diet-create@example.com');

    const res = await request(app)
      .post('/api/diet-plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test plan',
        targetCalories: 2000,
        meals: [
          {
            mealType: 'BREAKFAST',
            description: 'Oats',
            calories: 300,
            proteinG: 10,
            fatG: 5,
            carbsG: 50,
          },
          {
            mealType: 'LUNCH',
            description: 'Salad',
            calories: 400,
            proteinG: 30,
            fatG: 10,
            carbsG: 20,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.plan.totals).toEqual({ calories: 700, proteinG: 40, fatG: 15, carbsG: 70 });
  });

  it('replaces meals on update', async () => {
    const token = await registerAndGetToken('diet-update@example.com');
    const createRes = await request(app)
      .post('/api/diet-plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Plan', meals: [{ mealType: 'BREAKFAST', description: 'A', calories: 100 }] });
    const id = createRes.body.plan.id;

    const updateRes = await request(app)
      .put(`/api/diet-plans/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Plan v2', meals: [{ mealType: 'DINNER', description: 'B', calories: 200 }] });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.plan.meals).toHaveLength(1);
    expect(updateRes.body.plan.meals[0].description).toBe('B');
    expect(updateRes.body.plan.totals.calories).toBe(200);
  });

  it('scopes get/delete to the owning user', async () => {
    const token = await registerAndGetToken('diet-owner@example.com');
    const otherToken = await registerAndGetToken('diet-other@example.com');

    const createRes = await request(app)
      .post('/api/diet-plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Private plan', meals: [] });
    const id = createRes.body.plan.id;

    const otherGet = await request(app)
      .get(`/api/diet-plans/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherGet.status).toBe(404);

    const otherDelete = await request(app)
      .delete(`/api/diet-plans/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherDelete.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/diet-plans/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownDelete.status).toBe(204);
  });

  it('rejects invalid meal types', async () => {
    const token = await registerAndGetToken('diet-invalid@example.com');
    const res = await request(app)
      .post('/api/diet-plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad', meals: [{ mealType: 'BRUNCH', description: 'x' }] });
    expect(res.status).toBe(400);
  });
});
