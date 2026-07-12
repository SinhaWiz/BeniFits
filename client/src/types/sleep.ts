export interface SleepEntry {
  id: string;
  userId: string;
  recordedAt: string;
  bedtime: string;
  wakeTime: string;
  durationMinutes: number;
  qualityRating: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SleepEntryInput {
  recordedAt: string;
  bedtime: string;
  wakeTime: string;
  qualityRating?: number;
  notes?: string;
}
