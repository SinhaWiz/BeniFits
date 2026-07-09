import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { ProgressEntry, ProgressEntryInput } from '../types/progress';

interface ProgressFormValues {
  recordedAt: string;
  weightKg: string;
  sleepHours: string;
  waterIntakeMl: string;
  exerciseMinutes: string;
  notes: string;
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const emptyFormValues: ProgressFormValues = {
  recordedAt: todayDateInputValue(),
  weightKg: '',
  sleepHours: '',
  waterIntakeMl: '',
  exerciseMinutes: '',
  notes: '',
};

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

function formValuesToPayload(values: ProgressFormValues): ProgressEntryInput {
  return {
    recordedAt: values.recordedAt,
    weightKg: toOptionalNumber(values.weightKg),
    sleepHours: toOptionalNumber(values.sleepHours),
    waterIntakeMl: toOptionalNumber(values.waterIntakeMl),
    exerciseMinutes: toOptionalNumber(values.exerciseMinutes),
    notes: values.notes.trim() || undefined,
  };
}

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-300';

export default function ProgressPage() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const entriesQuery = useQuery({
    queryKey: ['progress'],
    queryFn: async () => {
      const res = await apiClient.get<{ entries: ProgressEntry[] }>('/progress');
      return res.data.entries;
    },
  });

  const { register, handleSubmit, reset } = useForm<ProgressFormValues>({
    defaultValues: emptyFormValues,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: ProgressEntryInput) => {
      const res = await apiClient.post<{ entry: ProgressEntry }>('/progress', payload);
      return res.data.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      setServerError(null);
      reset({ ...emptyFormValues, recordedAt: todayDateInputValue() });
    },
    onError: (err) => {
      setServerError(getErrorMessage(err, 'Unable to save this entry'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/progress/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  const onSubmit = (values: ProgressFormValues) => {
    createMutation.mutate(formValuesToPayload(values));
  };

  const entries = entriesQuery.data ?? [];
  const chartData = entries
    .filter((entry) => entry.weightKg != null)
    .map((entry) => ({ date: entry.recordedAt.slice(0, 10), weightKg: entry.weightKg }));
  const sortedEntries = [...entries].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <h1 className="text-2xl font-bold">Progress tracking</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid grid-cols-2 gap-4" noValidate>
          <div>
            <label htmlFor="recordedAt" className={labelClass}>
              Date
            </label>
            <input
              id="recordedAt"
              type="date"
              className={inputClass}
              {...register('recordedAt', { required: true })}
            />
          </div>
          <div>
            <label htmlFor="weightKg" className={labelClass}>
              Weight (kg)
            </label>
            <input
              id="weightKg"
              type="number"
              min={0}
              step="0.1"
              className={inputClass}
              {...register('weightKg')}
            />
          </div>
          <div>
            <label htmlFor="sleepHours" className={labelClass}>
              Sleep (hours)
            </label>
            <input
              id="sleepHours"
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              {...register('sleepHours')}
            />
          </div>
          <div>
            <label htmlFor="waterIntakeMl" className={labelClass}>
              Water (ml)
            </label>
            <input
              id="waterIntakeMl"
              type="number"
              min={0}
              className={inputClass}
              {...register('waterIntakeMl')}
            />
          </div>
          <div>
            <label htmlFor="exerciseMinutes" className={labelClass}>
              Exercise (minutes)
            </label>
            <input
              id="exerciseMinutes"
              type="number"
              min={0}
              className={inputClass}
              {...register('exerciseMinutes')}
            />
          </div>
          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>
            <input id="notes" type="text" className={inputClass} {...register('notes')} />
          </div>

          {serverError && <p className="col-span-2 text-sm text-rose-400">{serverError}</p>}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="col-span-2 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Saving...' : 'Log entry'}
          </button>
        </form>
      </section>

      {chartData.length > 1 && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-200">Weight over time</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="weightKg" stroke="#38bdf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-200">Recent entries</h2>
        {entriesQuery.isLoading ? (
          <p className="mt-4 text-slate-300">Loading...</p>
        ) : sortedEntries.length === 0 ? (
          <p className="mt-4 text-slate-300">No entries logged yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Weight</th>
                  <th className="pb-2 pr-4">BMI</th>
                  <th className="pb-2 pr-4">Sleep</th>
                  <th className="pb-2 pr-4">Water</th>
                  <th className="pb-2 pr-4">Exercise</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {sortedEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/5">
                    <td className="py-2 pr-4">{entry.recordedAt.slice(0, 10)}</td>
                    <td className="py-2 pr-4">{entry.weightKg ?? '—'}</td>
                    <td className="py-2 pr-4">{entry.bmi ?? '—'}</td>
                    <td className="py-2 pr-4">{entry.sleepHours ?? '—'}</td>
                    <td className="py-2 pr-4">{entry.waterIntakeMl ?? '—'}</td>
                    <td className="py-2 pr-4">{entry.exerciseMinutes ?? '—'}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        className="text-rose-400 transition-colors hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
