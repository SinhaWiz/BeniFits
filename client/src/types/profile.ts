export const ACTIVITY_LEVELS = ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'] as const;
export const GOALS = [
  'LOSE_WEIGHT',
  'GAIN_MUSCLE',
  'MAINTAIN_WEIGHT',
  'HEALTHY_EATING',
  'IMPROVE_STAMINA',
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type Goal = (typeof GOALS)[number];

export interface HealthProfile {
  id: string;
  userId: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  bloodGroup: string | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  sleepHours: number | null;
  waterIntakeMl: number | null;
  diseases: string[];
  allergies: string[];
  foodPreferences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HealthProfileUpdate {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  bloodGroup?: string;
  activityLevel?: ActivityLevel;
  goal?: Goal;
  sleepHours?: number;
  waterIntakeMl?: number;
  diseases: string[];
  allergies: string[];
  foodPreferences: string[];
}
