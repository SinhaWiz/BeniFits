import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/gemini', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/gemini')>('../src/lib/gemini');
  return {
    ...actual,
    getGeminiClient: vi.fn(),
  };
});

import { app } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { getGeminiClient } from '../src/lib/gemini';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'AI Weight Loss Test' });
  return res.body.accessToken as string;
}

function mockGenerateContentClient(parsedOutput: unknown) {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue({ text: JSON.stringify(parsedOutput) }),
    },
  };
}

const sampleWeek = {
  weekNumber: 1,
  targetCalories: 2000,
  targetProteinG: 140,
  workoutSummary: 'Light cardio 3x/week',
  walkingGoalMinutes: 30,
  waterGoalMl: 2500,
  sleepGoalHours: 8,
  notes: 'Ease in gradually.',
};

beforeEach(async () => {
  vi.mocked(getGeminiClient).mockReset();
  await prisma.aiWeightLossPlanWeek.deleteMany();
  await prisma.aiWeightLossPlan.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.aiWeightLossPlanWeek.deleteMany();
  await prisma.aiWeightLossPlan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('AI weight-loss coach', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/ai/weight-loss-plans');
    expect(res.status).toBe(401);
  });

  it('validates the request body', async () => {
    const token = await registerAndGetToken('aiwlp-invalid@example.com');
    const res = await request(app)
      .post('/api/ai/weight-loss-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetWeightKg: 70, durationWeeks: 20 });
    expect(res.status).toBe(400);
  });

  it('generates and persists a plan from the parsed Gemini output', async () => {
    const token = await registerAndGetToken('aiwlp-generate@example.com');
    vi.mocked(getGeminiClient).mockReturnValue(
      mockGenerateContentClient({ summary: 'A gradual plan.', weeks: [sampleWeek] }) as never,
    );

    const res = await request(app)
      .post('/api/ai/weight-loss-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetWeightKg: 70, durationWeeks: 8 });

    expect(res.status).toBe(201);
    expect(res.body.plan.summary).toBe('A gradual plan.');
    expect(res.body.plan.weeks).toHaveLength(1);
    expect(res.body.plan.weeks[0].targetCalories).toBe(2000);

    const listRes = await request(app)
      .get('/api/ai/weight-loss-plans')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.plans).toHaveLength(1);
  });

  it('returns a 502 when Gemini returns output that fails schema validation', async () => {
    const token = await registerAndGetToken('aiwlp-badoutput@example.com');
    vi.mocked(getGeminiClient).mockReturnValue(
      mockGenerateContentClient({ summary: 'Missing weeks field' }) as never,
    );

    const res = await request(app)
      .post('/api/ai/weight-loss-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetWeightKg: 70, durationWeeks: 8 });
    expect(res.status).toBe(502);
  });

  it('scopes get/delete to the owning user', async () => {
    const token = await registerAndGetToken('aiwlp-owner@example.com');
    const otherToken = await registerAndGetToken('aiwlp-other@example.com');
    vi.mocked(getGeminiClient).mockReturnValue(
      mockGenerateContentClient({ summary: 'Plan', weeks: [sampleWeek] }) as never,
    );

    const createRes = await request(app)
      .post('/api/ai/weight-loss-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetWeightKg: 65, durationWeeks: 4 });
    const id = createRes.body.plan.id;

    const otherGet = await request(app)
      .get(`/api/ai/weight-loss-plans/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherGet.status).toBe(404);

    const otherDelete = await request(app)
      .delete(`/api/ai/weight-loss-plans/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherDelete.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/ai/weight-loss-plans/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownDelete.status).toBe(204);
  });

  it('returns a 503 when the API key is not configured, with no orphaned plan', async () => {
    const token = await registerAndGetToken('aiwlp-nokey@example.com');
    vi.mocked(getGeminiClient).mockImplementation(() => {
      throw new AppError(503, 'not configured');
    });

    const res = await request(app)
      .post('/api/ai/weight-loss-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetWeightKg: 70, durationWeeks: 8 });
    expect(res.status).toBe(503);

    const listRes = await request(app)
      .get('/api/ai/weight-loss-plans')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.plans).toEqual([]);
  });
});
