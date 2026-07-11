import { XMLParser } from 'fast-xml-parser';
import { AppError } from '../errors/AppError';

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const CACHE_TTL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
// NCBI's usage guidelines ask for a tool identifier on every request. This
// must stay a fixed app identifier, never a real user's email address.
const TOOL_NAME = 'benifits-app';

export interface ResearchSummary {
  pmid: string;
  title: string;
  journal: string | null;
  authors: string[];
  year: string | null;
  abstract: string;
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

// Unlike the other content-platform clients, PubMed's E-utilities work
// without a key - an optional PUBMED_API_KEY only raises NCBI's rate
// limit, so this deliberately does not throw AppError(503).
function getApiKey(): string | undefined {
  return process.env.PUBMED_API_KEY || undefined;
}

async function fetchText(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch {
    throw new AppError(502, 'Unable to reach the PubMed service');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AppError(502, `PubMed service returned status ${response.status}`);
  }

  return response.text();
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

interface XmlTextNode {
  '#text'?: string | number;
  '@_Label'?: string;
}

// fast-xml-parser coerces numeric-looking text content (PMID, Year, ...)
// into JS numbers by default, so every extraction path must explicitly
// stringify - otherwise fields typed as `string` end up as `number` at
// runtime and silently violate the exposed API contract.
function textValue(node: string | number | XmlTextNode | undefined): string {
  if (node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node['#text'] !== undefined ? String(node['#text']) : '';
}

interface PubmedAuthor {
  ForeName?: string;
  LastName?: string;
}

function extractAuthors(authorList: { Author?: PubmedAuthor | PubmedAuthor[] } | undefined): string[] {
  return toArray(authorList?.Author)
    .map((author) => [author.ForeName, author.LastName].filter(Boolean).join(' '))
    .filter((name) => name.length > 0);
}

interface PubmedAbstract {
  AbstractText?: (string | XmlTextNode)[] | string | XmlTextNode;
}

function extractAbstract(abstractNode: PubmedAbstract | undefined): string {
  return toArray(abstractNode?.AbstractText)
    .map((text) => {
      if (typeof text === 'string') return text;
      const label = text['@_Label'];
      const body = text['#text'] ?? '';
      return label ? `${label}: ${body}` : body;
    })
    .join(' ');
}

interface PubmedArticleXml {
  MedlineCitation?: {
    PMID?: string | number | XmlTextNode;
    Article?: {
      ArticleTitle?: string | number | XmlTextNode;
      Journal?: {
        Title?: string;
        JournalIssue?: { PubDate?: { Year?: string | number } };
      };
      Abstract?: PubmedAbstract;
      AuthorList?: { Author?: PubmedAuthor | PubmedAuthor[] };
    };
  };
}

export async function searchResearch(query: string): Promise<ResearchSummary[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<ResearchSummary[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();

  const searchUrl = new URL(ESEARCH_URL);
  searchUrl.searchParams.set('db', 'pubmed');
  searchUrl.searchParams.set('term', query);
  searchUrl.searchParams.set('retmode', 'json');
  searchUrl.searchParams.set('retmax', '15');
  searchUrl.searchParams.set('sort', 'relevance');
  searchUrl.searchParams.set('tool', TOOL_NAME);
  if (apiKey) searchUrl.searchParams.set('api_key', apiKey);

  const searchText = await fetchText(searchUrl);
  const searchData = JSON.parse(searchText) as { esearchresult?: { idlist?: string[] } };
  const ids = searchData.esearchresult?.idlist ?? [];

  if (ids.length === 0) {
    setCached(cacheKey, []);
    return [];
  }

  const fetchUrl = new URL(EFETCH_URL);
  fetchUrl.searchParams.set('db', 'pubmed');
  fetchUrl.searchParams.set('id', ids.join(','));
  fetchUrl.searchParams.set('rettype', 'abstract');
  fetchUrl.searchParams.set('retmode', 'xml');
  fetchUrl.searchParams.set('tool', TOOL_NAME);
  if (apiKey) fetchUrl.searchParams.set('api_key', apiKey);

  const xmlText = await fetchText(fetchUrl);
  const parsed = xmlParser.parse(xmlText) as {
    PubmedArticleSet?: { PubmedArticle?: PubmedArticleXml | PubmedArticleXml[] };
  };
  const articles = toArray(parsed.PubmedArticleSet?.PubmedArticle);

  const results: ResearchSummary[] = articles.map((article) => {
    const citation = article.MedlineCitation;
    const articleNode = citation?.Article;
    const pmid = textValue(citation?.PMID);

    const year = articleNode?.Journal?.JournalIssue?.PubDate?.Year;

    return {
      pmid,
      title: textValue(articleNode?.ArticleTitle),
      journal: articleNode?.Journal?.Title ?? null,
      authors: extractAuthors(articleNode?.AuthorList),
      year: year !== undefined ? String(year) : null,
      abstract: extractAbstract(articleNode?.Abstract),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    };
  });

  setCached(cacheKey, results);
  return results;
}
