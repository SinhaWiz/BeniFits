export interface RecipeSummary {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
}

export interface RecipeDetail {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  sourceUrl: string | null;
  summary: string;
  ingredients: string[];
  instructions: string[];
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
}
