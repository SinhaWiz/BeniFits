import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { DietPlan, DietPlanInput, MealType } from '../types/dietPlan';
import type { NutritionSummary } from '../types/nutrition';

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

interface MealFormValues {
  mealType: MealType;
  description: string;
  calories: string;
  proteinG: string;
  fatG: string;
  carbsG: string;
  fdcId?: number;
}

interface DietPlanFormValues {
  title: string;
  targetCalories: string;
  targetProteinG: string;
  targetFatG: string;
  targetCarbsG: string;
  meals: MealFormValues[];
}

const emptyMeal: MealFormValues = {
  mealType: 'BREAKFAST',
  description: '',
  calories: '',
  proteinG: '',
  fatG: '',
  carbsG: '',
};

const emptyFormValues: DietPlanFormValues = {
  title: '',
  targetCalories: '',
  targetProteinG: '',
  targetFatG: '',
  targetCarbsG: '',
  meals: [],
};

function planToFormValues(plan: DietPlan): DietPlanFormValues {
  return {
    title: plan.title,
    targetCalories: plan.targetCalories?.toString() ?? '',
    targetProteinG: plan.targetProteinG?.toString() ?? '',
    targetFatG: plan.targetFatG?.toString() ?? '',
    targetCarbsG: plan.targetCarbsG?.toString() ?? '',
    meals: plan.meals.map((meal) => ({
      mealType: meal.mealType,
      description: meal.description,
      calories: meal.calories?.toString() ?? '',
      proteinG: meal.proteinG?.toString() ?? '',
      fatG: meal.fatG?.toString() ?? '',
      carbsG: meal.carbsG?.toString() ?? '',
      fdcId: meal.fdcId ?? undefined,
    })),
  };
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

function formValuesToPayload(values: DietPlanFormValues): DietPlanInput {
  return {
    title: values.title.trim(),
    targetCalories: toOptionalNumber(values.targetCalories),
    targetProteinG: toOptionalNumber(values.targetProteinG),
    targetFatG: toOptionalNumber(values.targetFatG),
    targetCarbsG: toOptionalNumber(values.targetCarbsG),
    meals: values.meals.map((meal) => ({
      mealType: meal.mealType,
      description: meal.description.trim(),
      fdcId: meal.fdcId,
      calories: toOptionalNumber(meal.calories),
      proteinG: toOptionalNumber(meal.proteinG),
      fatG: toOptionalNumber(meal.fatG),
      carbsG: toOptionalNumber(meal.carbsG),
    })),
  };
}

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-600';

export default function DietPlannerPage() {
  const queryClient = useQueryClient();
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [foodQuery, setFoodQuery] = useState('');
  const [foodSearchTerm, setFoodSearchTerm] = useState('');

  const plansQuery = useQuery({
    queryKey: ['dietPlans'],
    queryFn: async () => {
      const res = await apiClient.get<{ plans: DietPlan[] }>('/diet-plans');
      return res.data.plans;
    },
  });

  const foodSearchQuery = useQuery({
    queryKey: ['nutrition', 'search', foodSearchTerm],
    queryFn: async () => {
      const res = await apiClient.get<{ results: NutritionSummary[] }>('/nutrition/search', {
        params: { q: foodSearchTerm },
      });
      return res.data.results;
    },
    enabled: foodSearchTerm.length > 0,
  });

  const { register, control, handleSubmit, reset } = useForm<DietPlanFormValues>({
    defaultValues: emptyFormValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'meals' });

  const saveMutation = useMutation({
    mutationFn: async (values: DietPlanFormValues) => {
      const payload = formValuesToPayload(values);
      const res = editingPlanId
        ? await apiClient.put<{ plan: DietPlan }>(`/diet-plans/${editingPlanId}`, payload)
        : await apiClient.post<{ plan: DietPlan }>('/diet-plans', payload);
      return res.data.plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dietPlans'] });
      setServerError(null);
      setEditingPlanId(null);
      reset(emptyFormValues);
    },
    onError: (err) => {
      setServerError(getErrorMessage(err, 'Unable to save this diet plan'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/diet-plans/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['dietPlans'] });
      if (editingPlanId === id) {
        setEditingPlanId(null);
        reset(emptyFormValues);
      }
    },
  });

  const startEditing = (plan: DietPlan) => {
    setEditingPlanId(plan.id);
    reset(planToFormValues(plan));
  };

  const startNewPlan = () => {
    setEditingPlanId(null);
    reset(emptyFormValues);
  };

  const addFoodAsMeal = (food: NutritionSummary) => {
    append({
      mealType: 'SNACK',
      description: food.description,
      calories: food.calories?.toString() ?? '',
      proteinG: food.proteinG?.toString() ?? '',
      fatG: food.fatG?.toString() ?? '',
      carbsG: food.carbsG?.toString() ?? '',
      fdcId: food.fdcId,
    });
  };

  const onSubmit = (values: DietPlanFormValues) => {
    saveMutation.mutate(values);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-8 shadow-sm shadow-slate-200/60">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {editingPlanId ? 'Edit diet plan' : 'New diet plan'}
          </h1>
          {editingPlanId && (
            <button
              type="button"
              onClick={startNewPlan}
              className="text-sm text-slate-600 hover:text-white"
            >
              Start a new plan instead
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="title" className={labelClass}>
                Title
              </label>
              <input
                id="title"
                type="text"
                className={inputClass}
                {...register('title', { required: true })}
              />
            </div>
            <div>
              <label htmlFor="targetCalories" className={labelClass}>
                Target calories
              </label>
              <input
                id="targetCalories"
                type="number"
                min={0}
                className={inputClass}
                {...register('targetCalories')}
              />
            </div>
            <div>
              <label htmlFor="targetProteinG" className={labelClass}>
                Target protein (g)
              </label>
              <input
                id="targetProteinG"
                type="number"
                min={0}
                className={inputClass}
                {...register('targetProteinG')}
              />
            </div>
            <div>
              <label htmlFor="targetFatG" className={labelClass}>
                Target fat (g)
              </label>
              <input
                id="targetFatG"
                type="number"
                min={0}
                className={inputClass}
                {...register('targetFatG')}
              />
            </div>
            <div>
              <label htmlFor="targetCarbsG" className={labelClass}>
                Target carbs (g)
              </label>
              <input
                id="targetCarbsG"
                type="number"
                min={0}
                className={inputClass}
                {...register('targetCarbsG')}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
            <p className={labelClass}>Add a meal from a nutrition search</p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Search a food to add as a meal"
                className={inputClass}
                value={foodQuery}
                onChange={(e) => setFoodQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setFoodSearchTerm(foodQuery.trim())}
                disabled={!foodQuery.trim()}
                className="mt-1 shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60"
              >
                Search
              </button>
            </div>
            {foodSearchQuery.data && foodSearchQuery.data.length > 0 && (
              <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                {foodSearchQuery.data.map((food) => (
                  <li key={food.fdcId}>
                    <button
                      type="button"
                      onClick={() => addFoodAsMeal(food)}
                      className="w-full rounded-lg border border-slate-200/70 px-3 py-1.5 text-left text-sm text-slate-700 hover:border-slate-300"
                    >
                      {food.description}{' '}
                      <span className="text-xs text-slate-500">({food.calories ?? '—'} kcal)</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={labelClass}>Meals</p>
              <button
                type="button"
                onClick={() => append(emptyMeal)}
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                + Add meal manually
              </button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-slate-500">No meals yet. Add one above.</p>
            )}

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-6 items-end gap-2 rounded-xl border border-slate-200/70 bg-slate-50 p-3"
              >
                <div className="col-span-1">
                  <label className="text-xs text-slate-500">Type</label>
                  <select className={inputClass} {...register(`meals.${index}.mealType`)}>
                    {MEAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Description</label>
                  <input
                    type="text"
                    className={inputClass}
                    {...register(`meals.${index}.description`, { required: true })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Cal</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    {...register(`meals.${index}.calories`)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Protein</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    {...register(`meals.${index}.proteinG`)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mb-1 text-sm text-rose-600 hover:text-rose-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 font-semibold text-white shadow-sm shadow-teal-600/20 transition-all hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving...' : editingPlanId ? 'Save changes' : 'Create plan'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-8 shadow-sm shadow-slate-200/60">
        <h2 className="text-lg font-semibold text-slate-700">Your plans</h2>
        {plansQuery.isLoading ? (
          <p className="mt-4 text-slate-600">Loading...</p>
        ) : (plansQuery.data ?? []).length === 0 ? (
          <p className="mt-4 text-slate-600">No diet plans yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(plansQuery.data ?? []).map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{plan.title}</p>
                  <p className="text-sm text-slate-500">
                    {plan.totals.calories} kcal · {plan.totals.proteinG}g protein ·{' '}
                    {plan.totals.fatG}g fat · {plan.totals.carbsG}g carbs
                    {plan.targetCalories != null && ` (target ${plan.targetCalories} kcal)`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => startEditing(plan)}
                    className="text-sm text-teal-600 hover:text-teal-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(plan.id)}
                    className="text-sm text-rose-600 hover:text-rose-500"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
