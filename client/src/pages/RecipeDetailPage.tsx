import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Badge, Button, Card, Modal } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { DietPlan, MealType } from '../types/dietPlan';
import type { RecipeDetail } from '../types/recipe';

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none';
const NEW_PLAN_OPTION = '__new__';
const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(NEW_PLAN_OPTION);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [mealType, setMealType] = useState<MealType>('DINNER');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const recipeQuery = useQuery({
    queryKey: ['recipes', id],
    queryFn: async () => {
      const res = await apiClient.get<{ recipe: RecipeDetail }>(`/recipes/${id}`);
      return res.data.recipe;
    },
    enabled: Boolean(id),
  });

  const dietPlansQuery = useQuery({
    queryKey: ['dietPlans'],
    queryFn: async () => {
      const res = await apiClient.get<{ plans: DietPlan[] }>('/diet-plans');
      return res.data.plans;
    },
    enabled: showAddModal,
  });

  const addToPlanMutation = useMutation({
    mutationFn: async () => {
      const recipe = recipeQuery.data!;
      const newMeal = {
        mealType,
        description: recipe.title.slice(0, 200),
        calories: recipe.calories ?? undefined,
        proteinG: recipe.proteinG ?? undefined,
        fatG: recipe.fatG ?? undefined,
        carbsG: recipe.carbsG ?? undefined,
      };

      if (selectedPlanId === NEW_PLAN_OPTION) {
        await apiClient.post('/diet-plans', {
          title: newPlanTitle.trim() || recipe.title,
          meals: [newMeal],
        });
        return;
      }

      const plan = (dietPlansQuery.data ?? []).find((p) => p.id === selectedPlanId);
      if (!plan) return;

      await apiClient.put(`/diet-plans/${plan.id}`, {
        title: plan.title,
        targetCalories: plan.targetCalories ?? undefined,
        targetProteinG: plan.targetProteinG ?? undefined,
        targetFatG: plan.targetFatG ?? undefined,
        targetCarbsG: plan.targetCarbsG ?? undefined,
        meals: [
          ...plan.meals.map((meal) => ({
            mealType: meal.mealType,
            description: meal.description,
            fdcId: meal.fdcId ?? undefined,
            calories: meal.calories ?? undefined,
            proteinG: meal.proteinG ?? undefined,
            fatG: meal.fatG ?? undefined,
            carbsG: meal.carbsG ?? undefined,
          })),
          newMeal,
        ],
      });
    },
    onSuccess: () => {
      setAddError(null);
      setAddSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['dietPlans'] });
    },
    onError: (err) => {
      setAddError(getErrorMessage(err, 'Unable to add this recipe to a diet plan'));
    },
  });

  const closeModal = () => {
    setShowAddModal(false);
    setAddError(null);
    setAddSuccess(false);
    setSelectedPlanId(NEW_PLAN_OPTION);
    setNewPlanTitle('');
  };

  if (recipeQuery.isLoading) {
    return <p className="text-slate-600">Loading...</p>;
  }

  if (recipeQuery.isError || !recipeQuery.data) {
    return (
      <p className="text-sm text-rose-600">
        {getErrorMessage(recipeQuery.error, 'Unable to load this recipe')}
      </p>
    );
  }

  const recipe = recipeQuery.data;
  const plans = dietPlansQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold">{recipe.title}</h1>
          <Button type="button" onClick={() => setShowAddModal(true)}>
            Add to diet plan
          </Button>
        </div>
        {recipe.image && (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="mt-4 aspect-video w-full rounded-xl object-cover"
          />
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {recipe.readyInMinutes != null && <Badge>{recipe.readyInMinutes} min</Badge>}
          {recipe.servings != null && <Badge>{recipe.servings} servings</Badge>}
        </div>
        {recipe.summary && <p className="mt-4 text-sm text-slate-600">{recipe.summary}</p>}
        <dl className="mt-4 grid grid-cols-4 gap-3 text-center text-sm">
          <div>
            <dt className="text-slate-500">Calories</dt>
            <dd className="text-slate-900">{recipe.calories ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Protein</dt>
            <dd className="text-slate-900">{recipe.proteinG != null ? `${recipe.proteinG}g` : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Fat</dt>
            <dd className="text-slate-900">{recipe.fatG != null ? `${recipe.fatG}g` : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Carbs</dt>
            <dd className="text-slate-900">{recipe.carbsG != null ? `${recipe.carbsG}g` : '—'}</dd>
          </div>
        </dl>
      </Card>

      {recipe.ingredients.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-700">Ingredients</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {recipe.ingredients.map((ingredient, i) => (
              <li key={i}>{ingredient}</li>
            ))}
          </ul>
        </Card>
      )}

      {recipe.instructions.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-700">Instructions</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Card>
      )}

      {showAddModal && (
        <Modal title="Add to diet plan" onClose={closeModal}>
          {addSuccess ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Added to your diet plan.</p>
              <Button type="button" variant="secondary" onClick={closeModal}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="mealType" className="block text-sm font-medium text-slate-600">
                  Meal type
                </label>
                <select
                  id="mealType"
                  className={inputClass}
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                >
                  {MEAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="planId" className="block text-sm font-medium text-slate-600">
                  Diet plan
                </label>
                <select
                  id="planId"
                  className={inputClass}
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value={NEW_PLAN_OPTION}>Create a new plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPlanId === NEW_PLAN_OPTION && (
                <div>
                  <label htmlFor="newPlanTitle" className="block text-sm font-medium text-slate-600">
                    New plan title
                  </label>
                  <input
                    id="newPlanTitle"
                    type="text"
                    placeholder={recipe.title}
                    className={inputClass}
                    value={newPlanTitle}
                    onChange={(e) => setNewPlanTitle(e.target.value)}
                  />
                </div>
              )}
              {addError && <p className="text-sm text-rose-600">{addError}</p>}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => addToPlanMutation.mutate()}
                  disabled={addToPlanMutation.isPending}
                >
                  {addToPlanMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
