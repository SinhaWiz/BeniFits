export interface MoodEntry {
  id: string;
  userId: string;
  recordedAt: string;
  moodScore: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoodEntryInput {
  recordedAt: string;
  moodScore: number;
  note?: string;
}
