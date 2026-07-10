import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Button, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { NewsArticle } from '../types/news';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';

function formatDate(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NewsPage() {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const newsQuery = useQuery({
    queryKey: ['news', 'feed', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get<{ articles: NewsArticle[] }>('/news', {
        params: searchTerm ? { q: searchTerm } : undefined,
      });
      return res.data.articles;
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchTerm(inputValue.trim());
  };

  const articles = newsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">Health news</h1>
        <p className="mt-2 text-slate-300">
          The latest health headlines, or search for a specific topic.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            placeholder="Search news, e.g. nutrition"
            className={inputClass}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button type="submit" className="shrink-0">
            Search
          </Button>
          {searchTerm && (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => {
                setInputValue('');
                setSearchTerm('');
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {newsQuery.isError && (
          <p className="mt-4 text-sm text-rose-400">
            {getErrorMessage(newsQuery.error, 'Unable to load health news')}
          </p>
        )}
      </Card>

      {newsQuery.isLoading ? (
        <p className="text-slate-300">Loading...</p>
      ) : articles.length === 0 ? (
        <p className="text-slate-300">No articles found.</p>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.url}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-4"
              >
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="h-24 w-24 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div>
                  <h2 className="font-medium text-slate-100 hover:text-sky-300">
                    {article.title}
                  </h2>
                  {article.description && (
                    <p className="mt-1 text-sm text-slate-300">{article.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {article.source} · {formatDate(article.publishedAt)}
                  </p>
                </div>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
