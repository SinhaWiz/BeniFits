import { AppError } from '../errors/AppError';

const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
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
  const key = process.env.NEWS_API_KEY;
  if (!key) {
    throw new AppError(503, 'Health news is not configured (missing NEWS_API_KEY)');
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
    throw new AppError(502, 'Unable to reach the news service');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AppError(502, `News service returned status ${response.status}`);
  }

  return response.json();
}

interface NewsApiArticle {
  title: string;
  description?: string | null;
  url: string;
  urlToImage?: string | null;
  source?: { name?: string };
  publishedAt: string;
}

function shapeArticles(articles: NewsApiArticle[] | undefined): NewsArticle[] {
  return (articles ?? []).map((article) => ({
    title: article.title,
    description: article.description ?? null,
    url: article.url,
    imageUrl: article.urlToImage ?? null,
    source: article.source?.name ?? 'Unknown',
    publishedAt: article.publishedAt,
  }));
}

export async function getTopHealthNews(): Promise<NewsArticle[]> {
  const cacheKey = 'top-headlines:health';
  const cached = getCached<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${NEWS_API_BASE_URL}/top-headlines`);
  url.searchParams.set('apiKey', getApiKey());
  url.searchParams.set('category', 'health');
  url.searchParams.set('language', 'en');
  url.searchParams.set('pageSize', '20');

  const data = (await fetchJson(url)) as { articles: NewsApiArticle[] };
  const results = shapeArticles(data.articles);

  setCached(cacheKey, results);
  return results;
}

export async function searchNews(query: string): Promise<NewsArticle[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${NEWS_API_BASE_URL}/everything`);
  url.searchParams.set('apiKey', getApiKey());
  url.searchParams.set('q', query);
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('language', 'en');
  url.searchParams.set('pageSize', '20');

  const data = (await fetchJson(url)) as { articles: NewsApiArticle[] };
  const results = shapeArticles(data.articles);

  setCached(cacheKey, results);
  return results;
}
