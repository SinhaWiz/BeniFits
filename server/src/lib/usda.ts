import { AppError } from '../errors/AppError';

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

export interface NutritionSummary {
  fdcId: number;
  description: string;
  dataType: string;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  fiberG: number | null;
  sugarG: number | null;
}

// USDA's legacy nutrient numbers, stable across both the search and detail
// endpoints (the two endpoints report nutrients in different shapes, but
// both carry this number).
const NUTRIENT_NUMBERS: Record<
  keyof Omit<NutritionSummary, 'fdcId' | 'description' | 'dataType'>,
  string
> = {
  calories: '208',
  proteinG: '203',
  fatG: '204',
  carbsG: '205',
  fiberG: '291',
  sugarG: '269',
};

interface RawNutrient {
  // shape used by /foods/search
  nutrientNumber?: string;
  value?: number;
  // shape used by /food/:fdcId
  nutrient?: { number?: string };
  amount?: number;
}

function extractNutrients(
  nutrients: RawNutrient[] | undefined,
): Omit<NutritionSummary, 'fdcId' | 'description' | 'dataType'> {
  const result = {} as Omit<NutritionSummary, 'fdcId' | 'description' | 'dataType'>;
  for (const field of Object.keys(NUTRIENT_NUMBERS) as Array<keyof typeof NUTRIENT_NUMBERS>) {
    const number = NUTRIENT_NUMBERS[field];
    const match = nutrients?.find(
      (n) => n.nutrientNumber === number || n.nutrient?.number === number,
    );
    const raw = match?.value ?? match?.amount;
    result[field] = typeof raw === 'number' ? Math.round(raw * 10) / 10 : null;
  }
  return result;
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

function setCached<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getApiKey(): string {
  const key = process.env.USDA_FDC_API_KEY;
  if (!key) {
    throw new AppError(503, 'Nutrition search is not configured (missing USDA_FDC_API_KEY)');
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
    throw new AppError(502, 'Unable to reach the USDA nutrition service');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 404) {
    throw new AppError(404, 'Food not found');
  }
  if (!response.ok) {
    throw new AppError(502, `USDA nutrition service returned status ${response.status}`);
  }

  return response.json();
}

interface UsdaSearchFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients?: RawNutrient[];
}

export async function searchFoods(query: string): Promise<NutritionSummary[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<NutritionSummary[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${USDA_BASE_URL}/foods/search`);
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('query', query);
  // Note: "Survey (FNDDS)" is deliberately excluded - USDA's gateway 400s
  // when its parentheses are percent-encoded (as URLSearchParams always
  // does), even though the same encoding works fine for every other value.
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Branded');
  url.searchParams.set('pageSize', '15');

  const data = (await fetchJson(url)) as { foods: UsdaSearchFood[] };

  const results: NutritionSummary[] = (data.foods ?? []).map((food) => ({
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    ...extractNutrients(food.foodNutrients),
  }));

  setCached(cacheKey, results);
  return results;
}

interface UsdaFoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients?: RawNutrient[];
}

export async function getFoodDetail(fdcId: string): Promise<NutritionSummary> {
  const cacheKey = `detail:${fdcId}`;
  const cached = getCached<NutritionSummary>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${USDA_BASE_URL}/food/${encodeURIComponent(fdcId)}`);
  url.searchParams.set('api_key', getApiKey());

  const data = (await fetchJson(url)) as UsdaFoodDetail;

  const result: NutritionSummary = {
    fdcId: data.fdcId,
    description: data.description,
    dataType: data.dataType,
    ...extractNutrients(data.foodNutrients),
  };

  setCached(cacheKey, result);
  return result;
}
