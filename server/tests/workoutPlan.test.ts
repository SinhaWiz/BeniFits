import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Workout Test' });
  return res.body.accessToken as string;
}

beforeAll(async () => {
  await prisma.exercise.deleteMany({ where: { name: { startsWith: 'Test Exercise' } } });
  await prisma.exercise.createMany({
    data: [
      {
        name: 'Test Exercise Gym Beginner',
        category: 'GYM',
        difficulty: 'BEGINNER',
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        name: 'Test Exercise Cardio Beginner',
        category: 'CARDIO',
        difficulty: 'BEGINNER',
        durationMinutes: 20,
      },
      {
        name: 'Test Exercise Home Beginner',
        category: 'HOME',
        difficulty: 'BEGINNER',
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        name: 'Test Exercise Yoga Beginner',
        category: 'YOGA',
        difficulty: 'BEGINNER',
        durationMinutes: 20,
      },
      {
        name: 'Test Exercise Hiit Beginner',
        category: 'HIIT',
        difficulty: 'BEGINNER',
        durationMinutes: 15,
      },
      {
        name: 'Test Exercise Gym Advanced',
        category: 'GYM',
        difficulty: 'ADVANCED',
        defaultSets: 5,
        defaultReps: 5,
      },
    ],
  });
});

beforeEach(async () => {
  await prisma.workoutPlanExercise.deleteMany();
  await prisma.workoutPlanDay.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.workoutPlanExercise.deleteMany();
  await prisma.workoutPlanDay.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.exercise.deleteMany({ where: { name: { startsWith: 'Test Exercise' } } });
  await prisma.$disconnect();
});

describe('workout plans', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/workout-plans');
    expect(res.status).toBe(401);
  });

  it('generates a 7-day plan with rest days when no profile is set', async () => {
    const token = await registerAndGetToken('workout-default@example.com');

    const res = await request(app)
      .post('/api/workout-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.plan.days).toHaveLength(7);
    expect(res.body.plan.title).toMatch(/beginner/i);
    const restDays = res.body.plan.days.filter(
      (day: { category: string }) => day.category === 'REST',
    );
    expect(restDays.length).toBeGreaterThan(0);
  });

  it('picks difficulty from activityLevel and rotation from goal', async () => {
    const token = await registerAndGetToken('workout-goal@example.com');
    await request(app).put('/api/profile').set('Authorization', `Bearer ${token}`).send({
      activityLevel: 'VERY_ACTIVE',
      goal: 'GAIN_MUSCLE',
      diseases: [],
      allergies: [],
      foodPreferences: [],
    });

    const res = await request(app)
      .post('/api/workout-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.body.plan.title).toMatch(/advanced/i);
    const gymDays = res.body.plan.days.filter(
      (day: { category: string }) => day.category === 'GYM',
    );
    expect(gymDays.length).toBeGreaterThan(0);
    for (const day of gymDays) {
      for (const entry of day.exercises) {
        expect(entry.exercise.difficulty).toBe('ADVANCED');
      }
    }
  });

  it('scopes get/delete to the owning user', async () => {
    const token = await registerAndGetToken('workout-owner@example.com');
    const otherToken = await registerAndGetToken('workout-other@example.com');

    const createRes = await request(app)
      .post('/api/workout-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const id = createRes.body.plan.id;

    const otherGet = await request(app)
      .get(`/api/workout-plans/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherGet.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/workout-plans/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownDelete.status).toBe(204);
  });
});
