import { AppError } from '../errors/AppError';

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

export interface VideoResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  channelTitle: string;
  publishedAt: string;
  url: string;
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
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new AppError(503, 'Video search is not configured (missing YOUTUBE_API_KEY)');
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
    throw new AppError(502, 'Unable to reach the video service');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AppError(502, `Video service returned status ${response.status}`);
  }

  return response.json();
}

interface YoutubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
  };
}

export async function searchVideos(query: string): Promise<VideoResult[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<VideoResult[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${YOUTUBE_BASE_URL}/search`);
  url.searchParams.set('key', getApiKey());
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', '12');

  const data = (await fetchJson(url)) as { items: YoutubeSearchItem[] };

  const results: VideoResult[] = (data.items ?? []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));

  setCached(cacheKey, results);
  return results;
}
