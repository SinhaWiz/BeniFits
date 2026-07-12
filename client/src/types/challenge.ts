export const CHALLENGE_METRICS = [
  'MEDITATION_MINUTES',
  'MOOD_LOGS',
  'SLEEP_LOGS',
  'ACTIVE_DAYS',
] as const;

export type ChallengeMetric = (typeof CHALLENGE_METRICS)[number];

export interface Challenge {
  id: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  participantCount: number;
  joined: boolean;
}

export interface ChallengeDetail {
  id: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  avatar: string | null;
  joinedAt: string;
  progress: number;
  rank: number;
}
