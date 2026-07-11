import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Button, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { VideoResult } from '../types/video';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';

export default function VideosPage() {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const searchQuery = useQuery({
    queryKey: ['videos', 'search', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get<{ results: VideoResult[] }>('/videos/search', {
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
        <h1 className="text-2xl font-bold">Videos</h1>
        <p className="mt-2 text-slate-300">Search for fitness and wellness videos on YouTube.</p>

        <form onSubmit={onSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            placeholder="Search videos, e.g. HIIT workout"
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
            {getErrorMessage(searchQuery.error, 'Unable to search videos')}
          </p>
        )}
      </Card>

      {searchQuery.isLoading ? (
        <p className="text-slate-300">Searching...</p>
      ) : searchTerm && results.length === 0 ? (
        <p className="text-slate-300">No videos found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((video) => (
            <a
              key={video.videoId}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="h-full transition-colors hover:border-white/20">
                {video.thumbnailUrl && (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="mb-3 aspect-video w-full rounded-xl object-cover"
                  />
                )}
                <h2 className="line-clamp-2 font-medium text-slate-100">{video.title}</h2>
                <p className="mt-1 text-xs text-slate-400">{video.channelTitle}</p>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
