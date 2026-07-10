import { AppError } from '../errors/AppError';

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com/recipes';
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

export interface RecipeSummary {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
}

export interface RecipeDetail {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  sourceUrl: string | null;
  summary: string;
  ingredients: string[];
  instructions: string[];
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function getApiKey(): string {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    throw new AppError(503, 'Recipe search is not configured (missing SPOONACULAR_API_KEY)');
  }
  return key;
}

async function fetchJson(url: URL): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch {
    throw new AppError(502, 'Unable to reach the recipe service');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 404) {
    throw new AppError(404, 'Recipe not found');
  }
  if (!response.ok) {
    throw new AppError(502, `Recipe service returned status ${response.status}`);
  }

  return response.json();
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface SpoonacularSearchResult {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
}

export async function searchRecipes(query: string): Promise<RecipeSummary[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<RecipeSummary[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${SPOONACULAR_BASE_URL}/complexSearch`);
  url.searchParams.set('apiKey', getApiKey());
  url.searchParams.set('query', query);
  url.searchParams.set('number', '12');

  const data = (await fetchJson(url)) as { results: SpoonacularSearchResult[] };

  const results: RecipeSummary[] = (data.results ?? []).map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image ?? null,
    readyInMinutes: recipe.readyInMinutes ?? null,
    servings: recipe.servings ?? null,
  }));

  setCached(cacheKey, results, SEARCH_CACHE_TTL_MS);
  return results;
}

interface SpoonacularNutrient {
  name: string;
  amount: number;
}

interface SpoonacularInstructionStep {
  step: string;
}

interface SpoonacularAnalyzedInstruction {
  steps: SpoonacularInstructionStep[];
}

interface SpoonacularRecipeDetail {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  summary?: string;
  extendedIngredients?: { original: string }[];
  analyzedInstructions?: SpoonacularAnalyzedInstruction[];
  nutrition?: { nutrients?: SpoonacularNutrient[] };
}

function extractNutrient(nutrients: SpoonacularNutrient[] | undefined, name: string): number | null {
  const match = nutrients?.find((n) => n.name === name);
  return typeof match?.amount === 'number' ? Math.round(match.amount * 10) / 10 : null;
}

export async function getRecipeDetail(id: string): Promise<RecipeDetail> {
  const cacheKey = `detail:${id}`;
  const cached = getCached<RecipeDetail>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${SPOONACULAR_BASE_URL}/${encodeURIComponent(id)}/information`);
  url.searchParams.set('apiKey', getApiKey());
  url.searchParams.set('includeNutrition', 'true');

  const data = (await fetchJson(url)) as SpoonacularRecipeDetail;

  const instructions = data.analyzedInstructions?.[0]?.steps.map((step) => step.step) ?? [];
  const nutrients = data.nutrition?.nutrients;

  const result: RecipeDetail = {
    id: data.id,
    title: data.title,
    image: data.image ?? null,
    readyInMinutes: data.readyInMinutes ?? null,
    servings: data.servings ?? null,
    sourceUrl: data.sourceUrl ?? null,
    summary: data.summary ? stripHtml(data.summary) : '',
    ingredients: (data.extendedIngredients ?? []).map((ingredient) => ingredient.original),
    instructions,
    calories: extractNutrient(nutrients, 'Calories'),
    proteinG: extractNutrient(nutrients, 'Protein'),
    fatG: extractNutrient(nutrients, 'Fat'),
    carbsG: extractNutrient(nutrients, 'Carbohydrates'),
  };

  setCached(cacheKey, result, DETAIL_CACHE_TTL_MS);
  return result;
}
