export interface WellnessBadge {
  key: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface WellnessSummary {
  streak: number;
  counts: {
    moodCount: number;
    sleepCount: number;
    meditationCount: number;
  };
  badges: WellnessBadge[];
}
