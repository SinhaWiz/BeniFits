export interface NutritionSummary {
  fdcId: number;
  description: string;
  dataType: string;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  fiberG: number | null;
  sugarG: number | null;
}
