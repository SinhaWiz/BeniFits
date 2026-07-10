import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { AiWeightLossPlan } from '../types/aiWeightLossPlan';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-300';

export default function AiWeightLossCoachPage() {
  const queryClient = useQueryClient();
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('8');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ['aiWeightLossPlans'],
    queryFn: async () => {
      const res = await apiClient.get<{ plans: AiWeightLossPlan[] }>('/ai/weight-loss-plans');
      return res.data.plans;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ plan: AiWeightLossPlan }>(
        '/ai/weight-loss-plans/generate',
        {
          targetWeightKg: Number(targetWeightKg),
          durationWeeks: Number(durationWeeks),
        },
      );
      return res.data.plan;
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['aiWeightLossPlans'] });
      setSelectedPlanId(plan.id);
      setErrorText(null);
    },
    onError: (err) => {
      setErrorText(getErrorMessage(err, 'Unable to generate a weight-loss plan'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/ai/weight-loss-plans/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['aiWeightLossPlans'] });
      if (selectedPlanId === id) setSelectedPlanId(null);
    },
  });

  const plans = plansQuery.data ?? [];
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    if (!targetWeightKg.trim()) return;
    generateMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <h1 className="text-2xl font-bold">AI weight-loss coach</h1>
        <p className="mt-2 text-slate-300">
          Generates a week-by-week calorie, protein, workout, walking, water, and sleep plan from
          your profile and target weight.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Not medical advice. Consult a doctor before starting any new diet or exercise program.
        </p>

        <form onSubmit={handleGenerate} className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="targetWeightKg" className={labelClass}>
              Target weight (kg)
            </label>
            <input
              id="targetWeightKg"
              type="number"
              min={0}
              step="0.1"
              className={inputClass}
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="durationWeeks" className={labelClass}>
              Duration (weeks)
            </label>
            <select
              id="durationWeeks"
              className={inputClass}
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)}
            >
              {[4, 6, 8, 10, 12].map((weeks) => (
                <option key={weeks} value={weeks}>
                  {weeks} weeks
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={generateMutation.isPending || !targetWeightKg.trim()}
            className="col-span-2 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate plan'}
          </button>
        </form>
        {errorText && <p className="mt-4 text-sm text-rose-400">{errorText}</p>}
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
                    {plan.targetWeightKg}kg in {plan.durationWeeks}w
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selectedPlan && (
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">
                  Target {selectedPlan.targetWeightKg}kg &middot; {selectedPlan.durationWeeks} weeks
                </h2>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(selectedPlan.id)}
                  className="text-sm text-rose-400 hover:text-rose-300"
                >
                  Delete plan
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-300">{selectedPlan.summary}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedPlan.weeks.map((week) => (
                  <div
                    key={week.id}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm"
                  >
                    <p className="font-medium text-slate-200">Week {week.weekNumber}</p>
                    <dl className="mt-2 space-y-1 text-slate-300">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Calories</dt>
                        <dd>{week.targetCalories} kcal</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Protein</dt>
                        <dd>{week.targetProteinG}g</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Walking</dt>
                        <dd>{week.walkingGoalMinutes} min/day</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Water</dt>
                        <dd>{week.waterGoalMl} ml/day</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Sleep</dt>
                        <dd>{week.sleepGoalHours}h</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-slate-400">{week.workoutSummary}</p>
                    {week.notes && <p className="mt-2 text-xs text-slate-500">{week.notes}</p>}
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
