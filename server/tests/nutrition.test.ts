import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/usda', () => ({
  searchFoods: vi.fn(),
  getFoodDetail: vi.fn(),
}));

import { app } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { getFoodDetail, searchFoods } from '../src/lib/usda';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Nutrition Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  vi.mocked(searchFoods).mockReset();
  vi.mocked(getFoodDetail).mockReset();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('nutrition search', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/nutrition/search?q=banana');
    expect(res.status).toBe(401);
  });

  it('returns normalized results from the USDA client', async () => {
    const token = await registerAndGetToken('nutrition-search@example.com');
    vi.mocked(searchFoods).mockResolvedValue([
      {
        fdcId: 1,
        description: 'Banana',
        dataType: 'SR Legacy',
        calories: 89,
        proteinG: 1.1,
        fatG: 0.3,
        carbsG: 22.8,
        fiberG: 2.6,
        sugarG: 12.2,
      },
    ]);

    const res = await request(app)
      .get('/api/nutrition/search?q=banana')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(searchFoods).toHaveBeenCalledWith('banana');
  });

  it('rejects a missing query param', async () => {
    const token = await registerAndGetToken('nutrition-missing-q@example.com');
    const res = await request(app)
      .get('/api/nutrition/search')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns food detail from the USDA client', async () => {
    const token = await registerAndGetToken('nutrition-detail@example.com');
    vi.mocked(getFoodDetail).mockResolvedValue({
      fdcId: 173944,
      description: 'Bananas, raw',
      dataType: 'SR Legacy',
      calories: 89,
      proteinG: 1.1,
      fatG: 0.3,
      carbsG: 22.8,
      fiberG: 2.6,
      sugarG: 12.2,
    });

    const res = await request(app)
      .get('/api/nutrition/foods/173944')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.food.fdcId).toBe(173944);
    expect(getFoodDetail).toHaveBeenCalledWith('173944');
  });

  it('propagates errors from the USDA client', async () => {
    const token = await registerAndGetToken('nutrition-404@example.com');
    vi.mocked(getFoodDetail).mockRejectedValue(new AppError(404, 'Food not found'));

    const res = await request(app)
      .get('/api/nutrition/foods/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
