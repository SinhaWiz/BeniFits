export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface DietPlanMeal {
  id: string;
  dietPlanId: string;
  mealType: MealType;
  description: string;
  fdcId: number | null;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
}

export interface DietPlanTotals {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface DietPlan {
  id: string;
  userId: string;
  title: string;
  targetCalories: number | null;
  targetProteinG: number | null;
  targetFatG: number | null;
  targetCarbsG: number | null;
  meals: DietPlanMeal[];
  totals: DietPlanTotals;
  createdAt: string;
  updatedAt: string;
}

export interface DietPlanMealInput {
  mealType: MealType;
  description: string;
  fdcId?: number;
  calories?: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
}

export interface DietPlanInput {
  title: string;
  targetCalories?: number;
  targetProteinG?: number;
  targetFatG?: number;
  targetCarbsG?: number;
  meals: DietPlanMealInput[];
}
