import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Badge, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { ExpertSummary } from '../types/expert';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-300';

export default function ExpertsPage() {
  const [specialty, setSpecialty] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ specialty: '', q: '' });

  const expertsQuery = useQuery({
    queryKey: ['experts', filters],
    queryFn: async () => {
      const res = await apiClient.get<{ experts: ExpertSummary[] }>('/experts', {
        params: filters,
      });
      return res.data.experts;
    },
  });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setFilters({ specialty: specialty.trim(), q: q.trim() });
  };

  const experts = expertsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">Find an expert</h1>
        <p className="mt-2 text-slate-300">
          Browse nutritionists, doctors, and coaches available for one-on-one consultations.
        </p>

        <form onSubmit={handleSearch} className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="q" className={labelClass}>
              Search
            </label>
            <input
              id="q"
              type="text"
              placeholder="e.g. weight loss, diabetes"
              className={inputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="specialty" className={labelClass}>
              Specialty
            </label>
            <input
              id="specialty"
              type="text"
              placeholder="e.g. Weight Management"
              className={inputClass}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400"
            >
              Search
            </button>
          </div>
        </form>
      </Card>

      {expertsQuery.isLoading ? (
        <p className="text-slate-300">Loading...</p>
      ) : expertsQuery.isError ? (
        <p className="text-sm text-rose-400">
          {getErrorMessage(expertsQuery.error, 'Unable to load experts')}
        </p>
      ) : experts.length === 0 ? (
        <p className="text-slate-300">No experts match your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {experts.map((expert) => (
            <Link key={expert.id} to={`/experts/${expert.id}`}>
              <Card className="h-full transition-colors hover:border-white/20">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-100">
                    {expert.user.name ?? 'Expert'}
                  </h2>
                  <Badge>{expert.user.role}</Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-sky-300">{expert.specialty}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-300">{expert.bio}</p>
                {expert.yearsExperience != null && (
                  <p className="mt-2 text-xs text-slate-400">
                    {expert.yearsExperience} years experience
                  </p>
                )}
                {!expert.isAcceptingBookings && (
                  <p className="mt-2 text-xs text-rose-400">Not accepting bookings</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
