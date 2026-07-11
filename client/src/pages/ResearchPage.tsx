import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Button, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { ResearchSummary } from '../types/research';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';

export default function ResearchPage() {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const searchQuery = useQuery({
    queryKey: ['research', 'search', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get<{ results: ResearchSummary[] }>('/research/search', {
        params: { q: searchTerm },
      });
      return res.data.results;
    },
    enabled: searchTerm.length > 0,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchTerm(inputValue.trim());
  };

  const results = searchQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">Research summaries</h1>
        <p className="mt-2 text-slate-300">
          Search PubMed for published research abstracts on health and fitness topics.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            placeholder="Search research, e.g. resistance training"
            className={inputClass}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button type="submit" disabled={!inputValue.trim()} className="shrink-0">
            Search
          </Button>
        </form>

        {searchQuery.isError && (
          <p className="mt-4 text-sm text-rose-400">
            {getErrorMessage(searchQuery.error, 'Unable to search research')}
          </p>
        )}
      </Card>

      {searchQuery.isLoading ? (
        <p className="text-slate-300">Searching...</p>
      ) : searchTerm && results.length === 0 ? (
        <p className="text-slate-300">No research found.</p>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.pmid}>
              <h2 className="font-medium text-slate-100">{result.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {[result.journal, result.year].filter(Boolean).join(' · ')}
                {result.authors.length > 0 && ` · ${result.authors.join(', ')}`}
              </p>
              <p className="mt-3 text-sm text-slate-300">{result.abstract}</p>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-sky-300 hover:text-sky-200"
              >
                View on PubMed
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
