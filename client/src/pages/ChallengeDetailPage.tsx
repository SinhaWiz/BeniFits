import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type { ChallengeDetail, LeaderboardEntry } from '../types/challenge';

function metricUnitLabel(metric: ChallengeDetail['metric']): string {
  switch (metric) {
    case 'MEDITATION_MINUTES':
      return 'minutes';
    case 'MOOD_LOGS':
      return 'logs';
    case 'SLEEP_LOGS':
      return 'logs';
    case 'ACTIVE_DAYS':
      return 'days';
    default:
      return '';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const leaderboardQuery = useQuery({
    queryKey: ['challenges', id, 'leaderboard'],
    queryFn: async () => {
      const res = await apiClient.get<{ challenge: ChallengeDetail; leaderboard: LeaderboardEntry[] }>(
        `/challenges/${id}/leaderboard`,
      );
      return res.data;
    },
    enabled: Boolean(id),
  });

  if (leaderboardQuery.isLoading) {
    return <p className="text-center text-slate-300">Loading leaderboard...</p>;
  }

  const data = leaderboardQuery.data;
  if (!data) return null;

  const { challenge, leaderboard } = data;

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">{challenge.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{challenge.description}</p>
        <p className="mt-2 text-xs text-slate-500">
          {formatDate(challenge.startsAt)} &ndash; {formatDate(challenge.endsAt)}
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-200">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="mt-4 text-slate-300">No one has joined this challenge yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">Rank</th>
                  <th className="pb-2 pr-4">Participant</th>
                  <th className="pb-2 pr-4">Progress</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={`border-t border-white/5 ${
                      entry.userId === user?.id ? 'bg-sky-500/10' : ''
                    }`}
                  >
                    <td className="py-2 pr-4">#{entry.rank}</td>
                    <td className="py-2 pr-4">
                      {entry.name ?? 'Anonymous'}
                      {entry.userId === user?.id && (
                        <span className="ml-2 text-xs text-sky-400">(you)</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {entry.progress} {metricUnitLabel(challenge.metric)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
