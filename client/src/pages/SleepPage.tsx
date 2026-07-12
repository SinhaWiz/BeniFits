import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { NewBadgeBanner } from '../components/NewBadgeBanner';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { WellnessBadge } from '../types/gamification';
import type { HealthProfile } from '../types/profile';
import type { SleepEntry, SleepEntryInput } from '../types/sleep';

interface SleepFormValues {
  recordedAt: string;
  bedtime: string;
  wakeTime: string;
  qualityRating: string;
  notes: string;
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const emptyFormValues: SleepFormValues = {
  recordedAt: todayDateInputValue(),
  bedtime: '',
  wakeTime: '',
  qualityRating: '',
  notes: '',
};

function formValuesToPayload(values: SleepFormValues): SleepEntryInput {
  return {
    recordedAt: values.recordedAt,
    bedtime: values.bedtime,
    wakeTime: values.wakeTime,
    qualityRating: values.qualityRating ? Number(values.qualityRating) : undefined,
    notes: values.notes.trim() || undefined,
  };
}

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-300';

export default function SleepPage() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<WellnessBadge[]>([]);

  const entriesQuery = useQuery({
    queryKey: ['sleep'],
    queryFn: async () => {
      const res = await apiClient.get<{ entries: SleepEntry[] }>('/sleep');
      return res.data.entries;
    },
  });

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await apiClient.get<{ profile: HealthProfile | null }>('/profile');
      return res.data.profile;
    },
  });

  const { register, handleSubmit, reset } = useForm<SleepFormValues>({
    defaultValues: emptyFormValues,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: SleepEntryInput) => {
      const res = await apiClient.post<{ entry: SleepEntry; newBadges: WellnessBadge[] }>(
        '/sleep',
        payload,
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sleep'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'summary'] });
      setServerError(null);
      setNewBadges(data.newBadges);
      reset({ ...emptyFormValues, recordedAt: todayDateInputValue() });
    },
    onError: (err) => {
      setServerError(getErrorMessage(err, 'Unable to save this entry'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sleep/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep'] });
    },
  });

  const onSubmit = (values: SleepFormValues) => {
    createMutation.mutate(formValuesToPayload(values));
  };

  const entries = entriesQuery.data ?? [];
  const goalHours = profileQuery.data?.sleepGoalHours ?? null;
  const chartData = entries.map((entry) => ({
    date: entry.recordedAt.slice(0, 10),
    hours: Number(formatHours(entry.durationMinutes)),
  }));
  const sortedEntries = [...entries].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">Sleep tools</h1>
          {goalHours != null && (
            <span className="text-sm text-slate-300">
              Goal: <span className="font-semibold text-sky-300">{goalHours}h</span>
              <span className="text-slate-500"> (edit on Profile page)</span>
            </span>
          )}
        </div>

        <div className="mt-4">
          <NewBadgeBanner badges={newBadges} />
        </div>

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
            <label htmlFor="qualityRating" className={labelClass}>
              Quality (1-5)
            </label>
            <select id="qualityRating" className={inputClass} {...register('qualityRating')}>
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5].map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bedtime" className={labelClass}>
              Bedtime
            </label>
            <input
              id="bedtime"
              type="datetime-local"
              className={inputClass}
              {...register('bedtime', { required: true })}
            />
          </div>
          <div>
            <label htmlFor="wakeTime" className={labelClass}>
              Wake time
            </label>
            <input
              id="wakeTime"
              type="datetime-local"
              className={inputClass}
              {...register('wakeTime', { required: true })}
            />
          </div>
          <div className="col-span-2">
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
            {createMutation.isPending ? 'Saving...' : 'Log sleep'}
          </button>
        </form>
      </section>

      {chartData.length > 1 && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-200">Sleep duration over time</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 8,
                  }}
                  formatter={(value) => [`${value}h`, 'Sleep']}
                />
                {goalHours != null && (
                  <ReferenceLine
                    y={goalHours}
                    stroke="#34d399"
                    strokeDasharray="4 4"
                    label={{ value: 'Goal', position: 'right', fill: '#34d399', fontSize: 12 }}
                  />
                )}
                <Bar dataKey="hours" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-200">Recent entries</h2>
        {entriesQuery.isLoading ? (
          <p className="mt-4 text-slate-300">Loading...</p>
        ) : sortedEntries.length === 0 ? (
          <p className="mt-4 text-slate-300">No sleep logged yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Bedtime</th>
                  <th className="pb-2 pr-4">Wake time</th>
                  <th className="pb-2 pr-4">Duration</th>
                  <th className="pb-2 pr-4">Quality</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {sortedEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/5">
                    <td className="py-2 pr-4">{entry.recordedAt.slice(0, 10)}</td>
                    <td className="py-2 pr-4">{formatTime(entry.bedtime)}</td>
                    <td className="py-2 pr-4">{formatTime(entry.wakeTime)}</td>
                    <td className="py-2 pr-4">{formatHours(entry.durationMinutes)}h</td>
                    <td className="py-2 pr-4">{entry.qualityRating ?? '—'}</td>
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
