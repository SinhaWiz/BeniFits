import type { ChallengeMetric } from '../generated/prisma/enums';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { createNotification } from './notifications';
import { prisma } from './prisma';

export interface WellnessCounts {
  moodCount: number;
  sleepCount: number;
  meditationCount: number;
  currentStreak: number;
}

export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  isEarned: (counts: WellnessCounts) => boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: 'first-step',
    name: 'First Step',
    description: 'Logged your first wellness entry.',
    icon: '🌱',
    isEarned: (c) => c.moodCount + c.sleepCount + c.meditationCount >= 1,
  },
  {
    key: 'well-rounded',
    name: 'Well-Rounded',
    description: 'Tried mood tracking, sleep logging, and meditation.',
    icon: '🧭',
    isEarned: (c) => c.moodCount >= 1 && c.sleepCount >= 1 && c.meditationCount >= 1,
  },
  {
    key: 'streak-3',
    name: '3-Day Streak',
    description: 'Logged a wellness activity 3 days in a row.',
    icon: '🔥',
    isEarned: (c) => c.currentStreak >= 3,
  },
  {
    key: 'streak-7',
    name: '7-Day Streak',
    description: 'Logged a wellness activity 7 days in a row.',
    icon: '🔥',
    isEarned: (c) => c.currentStreak >= 7,
  },
  {
    key: 'streak-30',
    name: '30-Day Streak',
    description: 'Logged a wellness activity 30 days in a row.',
    icon: '🏆',
    isEarned: (c) => c.currentStreak >= 30,
  },
  {
    key: 'mood-10',
    name: 'Mood Tracker',
    description: 'Logged 10 mood entries.',
    icon: '😊',
    isEarned: (c) => c.moodCount >= 10,
  },
  {
    key: 'mood-30',
    name: 'Mood Historian',
    description: 'Logged 30 mood entries.',
    icon: '📔',
    isEarned: (c) => c.moodCount >= 30,
  },
  {
    key: 'sleep-10',
    name: 'Sleep Tracker',
    description: 'Logged 10 nights of sleep.',
    icon: '🌙',
    isEarned: (c) => c.sleepCount >= 10,
  },
  {
    key: 'meditation-5',
    name: 'Meditation Novice',
    description: 'Completed 5 guided meditation sessions.',
    icon: '🧘',
    isEarned: (c) => c.meditationCount >= 5,
  },
  {
    key: 'meditation-25',
    name: 'Meditation Master',
    description: 'Completed 25 guided meditation sessions.',
    icon: '🕉️',
    isEarned: (c) => c.meditationCount >= 25,
  },
];

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function computeWellnessStreak(userId: string): Promise<number> {
  const [moods, sleeps, meditations] = await Promise.all([
    prisma.moodEntry.findMany({ where: { userId }, select: { recordedAt: true } }),
    prisma.sleepEntry.findMany({ where: { userId }, select: { recordedAt: true } }),
    prisma.meditationLog.findMany({ where: { userId }, select: { completedOn: true } }),
  ]);

  const activeDays = new Set<string>();
  for (const entry of moods) activeDays.add(toDateKey(entry.recordedAt));
  for (const entry of sleeps) activeDays.add(toDateKey(entry.recordedAt));
  for (const entry of meditations) activeDays.add(toDateKey(entry.completedOn));

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!activeDays.has(toDateKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (activeDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getWellnessCounts(userId: string): Promise<WellnessCounts> {
  const [moodCount, sleepCount, meditationCount, currentStreak] = await Promise.all([
    prisma.moodEntry.count({ where: { userId } }),
    prisma.sleepEntry.count({ where: { userId } }),
    prisma.meditationLog.count({ where: { userId } }),
    computeWellnessStreak(userId),
  ]);
  return { moodCount, sleepCount, meditationCount, currentStreak };
}

export async function checkAndAwardBadges(userId: string): Promise<BadgeDefinition[]> {
  const counts = await getWellnessCounts(userId);
  const earned = await prisma.userBadge.findMany({ where: { userId }, select: { badgeKey: true } });
  const earnedKeys = new Set(earned.map((badge) => badge.badgeKey));

  const newlyEarned: BadgeDefinition[] = [];
  for (const badge of BADGE_DEFINITIONS) {
    if (earnedKeys.has(badge.key) || !badge.isEarned(counts)) continue;
    try {
      await prisma.userBadge.create({ data: { userId, badgeKey: badge.key } });
      newlyEarned.push(badge);
      await createNotification(
        userId,
        'BADGE_EARNED',
        `New badge: ${badge.name}`,
        badge.description,
      );
    } catch (err) {
      if (!(err instanceof PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }
  }
  return newlyEarned;
}

export async function computeChallengeProgress(
  userId: string,
  metric: ChallengeMetric,
  start: Date,
  end: Date,
): Promise<number> {
  const range = { gte: start, lte: end };

  switch (metric) {
    case 'MEDITATION_MINUTES': {
      const aggregate = await prisma.meditationLog.aggregate({
        where: { userId, completedOn: range },
        _sum: { durationMinutes: true },
      });
      return aggregate._sum.durationMinutes ?? 0;
    }
    case 'MOOD_LOGS':
      return prisma.moodEntry.count({ where: { userId, recordedAt: range } });
    case 'SLEEP_LOGS':
      return prisma.sleepEntry.count({ where: { userId, recordedAt: range } });
    case 'ACTIVE_DAYS': {
      const [moods, sleeps, meditations] = await Promise.all([
        prisma.moodEntry.findMany({ where: { userId, recordedAt: range }, select: { recordedAt: true } }),
        prisma.sleepEntry.findMany({ where: { userId, recordedAt: range }, select: { recordedAt: true } }),
        prisma.meditationLog.findMany({
          where: { userId, completedOn: range },
          select: { completedOn: true },
        }),
      ]);
      const days = new Set<string>();
      for (const entry of moods) days.add(toDateKey(entry.recordedAt));
      for (const entry of sleeps) days.add(toDateKey(entry.recordedAt));
      for (const entry of meditations) days.add(toDateKey(entry.completedOn));
      return days.size;
    }
    default:
      return 0;
  }
}
