export interface ProgressEntry {
  id: string;
  userId: string;
  recordedAt: string;
  weightKg: number | null;
  bmi: number | null;
  bodyFatPercent: number | null;
  waistCm: number | null;
  sleepHours: number | null;
  waterIntakeMl: number | null;
  exerciseMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEntryInput {
  recordedAt: string;
  weightKg?: number;
  bodyFatPercent?: number;
  waistCm?: number;
  sleepHours?: number;
  waterIntakeMl?: number;
  exerciseMinutes?: number;
  notes?: string;
}
