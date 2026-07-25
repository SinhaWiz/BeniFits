import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type { WellnessSummary } from '../types/gamification';

export default function WellnessPage() {
  const summaryQuery = useQuery({
    queryKey: ['gamification', 'summary'],
    queryFn: async () => {
      const res = await apiClient.get<WellnessSummary>('/gamification/summary');
      return res.data;
    },
  });

  if (summaryQuery.isLoading) {
    return <p className="text-center text-slate-600">Loading your wellness summary...</p>;
  }

  const summary = summaryQuery.data;
  if (!summary) return null;

  const earnedBadges = summary.badges.filter((badge) => badge.earned);
  const lockedBadges = summary.badges.filter((badge) => !badge.earned);

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">Wellness dashboard</h1>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 text-center">
            <p className="text-3xl font-bold text-amber-700">
              {summary.streak} <span aria-hidden="true">🔥</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Day streak</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">{summary.counts.moodCount}</p>
            <p className="mt-1 text-xs text-slate-500">Mood logs</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">{summary.counts.sleepCount}</p>
            <p className="mt-1 text-xs text-slate-500">Sleep logs</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">{summary.counts.meditationCount}</p>
            <p className="mt-1 text-xs text-slate-500">Meditation sessions</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-700">
          Badges earned ({earnedBadges.length}/{summary.badges.length})
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {earnedBadges.map((badge) => (
            <div
              key={badge.key}
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <span className="text-2xl" aria-hidden="true">
                {badge.icon}
              </span>
              <div>
                <p className="font-semibold text-amber-800">{badge.name}</p>
                <p className="text-xs text-slate-500">{badge.description}</p>
                {badge.earnedAt && (
                  <p className="mt-1 text-xs text-slate-500">
                    Earned {new Date(badge.earnedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
          {lockedBadges.map((badge) => (
            <div
              key={badge.key}
              className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 opacity-50"
            >
              <span className="text-2xl grayscale" aria-hidden="true">
                {badge.icon}
              </span>
              <div>
                <p className="font-semibold text-slate-600">{badge.name}</p>
                <p className="text-xs text-slate-500">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
