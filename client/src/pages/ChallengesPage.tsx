import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, Button, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { Challenge } from '../types/challenge';

function metricLabel(metric: Challenge['metric']): string {
  switch (metric) {
    case 'MEDITATION_MINUTES':
      return 'Meditation minutes';
    case 'MOOD_LOGS':
      return 'Mood logs';
    case 'SLEEP_LOGS':
      return 'Sleep logs';
    case 'ACTIVE_DAYS':
      return 'Active days';
    default:
      return metric;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChallengesPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const challengesQuery = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await apiClient.get<{ challenges: Challenge[] }>('/challenges');
      return res.data.challenges;
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      await apiClient.post(`/challenges/${challengeId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setError(null);
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Unable to join this challenge'));
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      await apiClient.delete(`/challenges/${challengeId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setError(null);
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Unable to leave this challenge'));
    },
  });

  const challenges = challengesQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">Challenges</h1>
        <p className="mt-1 text-sm text-slate-400">
          Join a challenge and see how you stack up on the leaderboard.
        </p>
        {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
      </Card>

      {challengesQuery.isLoading ? (
        <p className="text-slate-300">Loading...</p>
      ) : challenges.length === 0 ? (
        <p className="text-slate-300">No challenges available right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {challenges.map((challenge) => (
            <Card key={challenge.id}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-100">{challenge.title}</h2>
                <Badge>{metricLabel(challenge.metric)}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-400">{challenge.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDate(challenge.startsAt)} &ndash; {formatDate(challenge.endsAt)} &middot;{' '}
                {challenge.participantCount} joined
              </p>
              <div className="mt-4 flex items-center gap-3">
                {challenge.joined ? (
                  <Button
                    variant="secondary"
                    onClick={() => leaveMutation.mutate(challenge.id)}
                    disabled={leaveMutation.isPending}
                  >
                    Leave
                  </Button>
                ) : (
                  <Button
                    onClick={() => joinMutation.mutate(challenge.id)}
                    disabled={joinMutation.isPending}
                  >
                    Join
                  </Button>
                )}
                <Link
                  to={`/challenges/${challenge.id}`}
                  className="text-sm font-medium text-sky-400 hover:text-sky-300"
                >
                  View leaderboard
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
