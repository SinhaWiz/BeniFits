import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/spoonacular', () => ({
  searchRecipes: vi.fn(),
  getRecipeDetail: vi.fn(),
}));

import { app } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { getRecipeDetail, searchRecipes } from '../src/lib/spoonacular';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Recipes Test' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  vi.mocked(searchRecipes).mockReset();
  vi.mocked(getRecipeDetail).mockReset();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('recipes search', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/recipes/search?q=chicken');
    expect(res.status).toBe(401);
  });

  it('rejects a missing query param', async () => {
    const token = await registerAndGetToken('recipes-missing-q@example.com');
    const res = await request(app)
      .get('/api/recipes/search')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns results from the Spoonacular client', async () => {
    const token = await registerAndGetToken('recipes-search@example.com');
    vi.mocked(searchRecipes).mockResolvedValue([
      { id: 1, title: 'Chicken Stir Fry', image: null, readyInMinutes: 30, servings: 4 },
    ]);

    const res = await request(app)
      .get('/api/recipes/search?q=chicken')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(searchRecipes).toHaveBeenCalledWith('chicken');
  });

  it('returns recipe detail from the Spoonacular client', async () => {
    const token = await registerAndGetToken('recipes-detail@example.com');
    vi.mocked(getRecipeDetail).mockResolvedValue({
      id: 1,
      title: 'Chicken Stir Fry',
      image: null,
      readyInMinutes: 30,
      servings: 4,
      sourceUrl: null,
      summary: 'A tasty stir fry.',
      ingredients: ['chicken', 'soy sauce'],
      instructions: ['Cook chicken', 'Add sauce'],
      calories: 450,
      proteinG: 35,
      fatG: 12,
      carbsG: 40,
    });

    const res = await request(app)
      .get('/api/recipes/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.recipe.title).toBe('Chicken Stir Fry');
    expect(getRecipeDetail).toHaveBeenCalledWith('1');
  });

  it('propagates a 503 when the API key is not configured', async () => {
    const token = await registerAndGetToken('recipes-nokey@example.com');
    vi.mocked(searchRecipes).mockRejectedValue(
      new AppError(503, 'Recipe search is not configured (missing SPOONACULAR_API_KEY)'),
    );

    const res = await request(app)
      .get('/api/recipes/search?q=chicken')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
  });
});
