export const MEDITATION_CATEGORIES = [
  'BREATHING',
  'BODY_SCAN',
  'SLEEP',
  'FOCUS',
  'STRESS_RELIEF',
  'MINDFULNESS',
] as const;

export type MeditationCategory = (typeof MEDITATION_CATEGORIES)[number];

export interface MeditationSession {
  id: string;
  title: string;
  category: MeditationCategory;
  durationMinutes: number;
  description: string;
  createdAt: string;
}

export interface MeditationLog {
  id: string;
  userId: string;
  sessionId: string;
  completedOn: string;
  durationMinutes: number;
  createdAt: string;
  session: MeditationSession;
}

export interface MeditationLogInput {
  sessionId: string;
  completedOn: string;
  durationMinutes?: number;
}
