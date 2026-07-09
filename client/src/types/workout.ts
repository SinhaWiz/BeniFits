export type DayCategory = 'GYM' | 'HOME' | 'CARDIO' | 'HIIT' | 'YOGA' | 'STRETCHING' | 'REST';
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  difficulty: Difficulty;
  muscleGroup: string | null;
  defaultSets: number | null;
  defaultReps: number | null;
  durationMinutes: number | null;
  description: string | null;
}

export interface WorkoutPlanExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: number | null;
  reps: number | null;
  durationMinutes: number | null;
}

export interface WorkoutPlanDay {
  id: string;
  dayNumber: number;
  category: DayCategory;
  exercises: WorkoutPlanExercise[];
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  title: string;
  days: WorkoutPlanDay[];
  createdAt: string;
  updatedAt: string;
}
