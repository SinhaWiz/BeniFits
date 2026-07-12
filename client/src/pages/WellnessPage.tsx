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
    return <p className="text-center text-slate-300">Loading your wellness summary...</p>;
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
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center">
            <p className="text-3xl font-bold text-amber-300">
              {summary.streak} <span aria-hidden="true">🔥</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">Day streak</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center">
            <p className="text-3xl font-bold text-sky-300">{summary.counts.moodCount}</p>
            <p className="mt-1 text-xs text-slate-400">Mood logs</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center">
            <p className="text-3xl font-bold text-sky-300">{summary.counts.sleepCount}</p>
            <p className="mt-1 text-xs text-slate-400">Sleep logs</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center">
            <p className="text-3xl font-bold text-sky-300">{summary.counts.meditationCount}</p>
            <p className="mt-1 text-xs text-slate-400">Meditation sessions</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-200">
          Badges earned ({earnedBadges.length}/{summary.badges.length})
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {earnedBadges.map((badge) => (
            <div
              key={badge.key}
              className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4"
            >
              <span className="text-2xl" aria-hidden="true">
                {badge.icon}
              </span>
              <div>
                <p className="font-semibold text-amber-200">{badge.name}</p>
                <p className="text-xs text-slate-400">{badge.description}</p>
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
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 opacity-50"
            >
              <span className="text-2xl grayscale" aria-hidden="true">
                {badge.icon}
              </span>
              <div>
                <p className="font-semibold text-slate-300">{badge.name}</p>
                <p className="text-xs text-slate-500">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
