import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { WorkoutPlan, WorkoutPlanExercise } from '../types/workout';

const categoryStyles: Record<string, string> = {
  GYM: 'bg-sky-500/20 text-sky-300',
  HOME: 'bg-emerald-500/20 text-emerald-300',
  CARDIO: 'bg-orange-500/20 text-orange-300',
  HIIT: 'bg-rose-500/20 text-rose-300',
  YOGA: 'bg-violet-500/20 text-violet-300',
  STRETCHING: 'bg-teal-500/20 text-teal-300',
  REST: 'bg-slate-700/40 text-slate-400',
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
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workout planner</h1>
            <p className="mt-2 text-slate-300">
              Generates a 7-day plan from your profile goal and activity level.
            </p>
          </div>
          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="shrink-0 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate plan'}
          </button>
        </div>
        {serverError && <p className="mt-4 text-sm text-rose-400">{serverError}</p>}
      </section>

      {plansQuery.isLoading ? (
        <p className="text-slate-300">Loading...</p>
      ) : plans.length === 0 ? (
        <p className="text-slate-300">No plans yet. Generate one above.</p>
      ) : (
        <>
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-200">Your plans</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {plans.map((plan) => (
                <li key={plan.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      selectedPlan?.id === plan.id
                        ? 'border-sky-400 bg-sky-500/10 text-sky-300'
                        : 'border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {plan.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selectedPlan && (
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">{selectedPlan.title}</h2>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(selectedPlan.id)}
                  className="text-sm text-rose-400 hover:text-rose-300"
                >
                  Delete plan
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {selectedPlan.days.map((day) => (
                  <div
                    key={day.id}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-300">Day {day.dayNumber}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          categoryStyles[day.category] ?? 'bg-slate-700/40 text-slate-300'
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
                          <li key={entry.id} className="text-sm text-slate-200">
                            {entry.exercise.name}
                            <span className="ml-1 text-xs text-slate-400">
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
