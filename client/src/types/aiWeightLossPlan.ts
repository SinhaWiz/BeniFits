export interface AiWeightLossPlanWeek {
  id: string;
  planId: string;
  weekNumber: number;
  targetCalories: number;
  targetProteinG: number;
  workoutSummary: string;
  walkingGoalMinutes: number;
  waterGoalMl: number;
  sleepGoalHours: number;
  notes: string | null;
}

export interface AiWeightLossPlan {
  id: string;
  userId: string;
  targetWeightKg: number;
  durationWeeks: number;
  summary: string;
  weeks: AiWeightLossPlanWeek[];
  createdAt: string;
}
