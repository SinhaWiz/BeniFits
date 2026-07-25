import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { WorkoutPlan, WorkoutPlanExercise } from '../types/workout';

const categoryStyles: Record<string, string> = {
  GYM: 'bg-teal-50 text-teal-700',
  HOME: 'bg-emerald-50 text-emerald-700',
  CARDIO: 'bg-orange-50 text-orange-700',
  HIIT: 'bg-rose-50 text-rose-700',
  YOGA: 'bg-violet-50 text-violet-700',
  STRETCHING: 'bg-sky-50 text-sky-700',
  REST: 'bg-slate-100 text-slate-500',
};

function exerciseDetail(entry: WorkoutPlanExercise): string {
  if (entry.sets && entry.reps) return `${entry.sets} x ${entry.reps}`;
  if (entry.durationMinutes) return `${entry.durationMinutes} min`;
  return '';
}

export default function WorkoutPlannerPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ['workoutPlans'],
    queryFn: async () => {
      const res = await apiClient.get<{ plans: WorkoutPlan[] }>('/workout-plans');
      return res.data.plans;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ plan: WorkoutPlan }>('/workout-plans/generate', {});
      return res.data.plan;
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlans'] });
      setSelectedPlanId(plan.id);
      setServerError(null);
    },
    onError: (err) => {
      setServerError(getErrorMessage(err, 'Unable to generate a workout plan'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/workout-plans/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlans'] });
      if (selectedPlanId === id) setSelectedPlanId(null);
    },
  });

  const plans = plansQuery.data ?? [];
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-8 shadow-sm shadow-slate-200/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workout planner</h1>
            <p className="mt-2 text-slate-600">
              Generates a 7-day plan from your profile goal and activity level.
            </p>
          </div>
          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="shrink-0 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 font-semibold text-white shadow-sm shadow-teal-600/20 transition-all hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-60"
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate plan'}
          </button>
        </div>
        {serverError && <p className="mt-4 text-sm text-rose-600">{serverError}</p>}
      </section>

      {plansQuery.isLoading ? (
        <p className="text-slate-600">Loading...</p>
      ) : plans.length === 0 ? (
        <p className="text-slate-600">No plans yet. Generate one above.</p>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/60">
            <h2 className="text-lg font-semibold text-slate-700">Your plans</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {plans.map((plan) => (
                <li key={plan.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      selectedPlan?.id === plan.id
                        ? 'border-teal-500 bg-teal-50 text-teal-600'
                        : 'border-slate-200/70 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {plan.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selectedPlan && (
            <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/60">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-700">{selectedPlan.title}</h2>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(selectedPlan.id)}
                  className="text-sm text-rose-600 hover:text-rose-500"
                >
                  Delete plan
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {selectedPlan.days.map((day) => (
                  <div
                    key={day.id}
                    className="rounded-xl border border-slate-200/70 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-600">Day {day.dayNumber}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          categoryStyles[day.category] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {day.category}
                      </span>
                    </div>
                    {day.exercises.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">Rest day</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {day.exercises.map((entry) => (
                          <li key={entry.id} className="text-sm text-slate-700">
                            {entry.exercise.name}
                            <span className="ml-1 text-xs text-slate-500">
                              {exerciseDetail(entry)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
