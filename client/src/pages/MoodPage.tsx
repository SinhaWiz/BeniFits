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
import { NewBadgeBanner } from '../components/NewBadgeBanner';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { WellnessBadge } from '../types/gamification';
import type { MoodEntry, MoodEntryInput } from '../types/mood';

const MOOD_OPTIONS = [
  { score: 1, emoji: '😞', label: 'Awful' },
  { score: 2, emoji: '🙁', label: 'Bad' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
] as const;

interface MoodFormValues {
  recordedAt: string;
  moodScore: number;
  note: string;
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const emptyFormValues: MoodFormValues = {
  recordedAt: todayDateInputValue(),
  moodScore: 3,
  note: '',
};

function formValuesToPayload(values: MoodFormValues): MoodEntryInput {
  return {
    recordedAt: values.recordedAt,
    moodScore: values.moodScore,
    note: values.note.trim() || undefined,
  };
}

function labelForScore(score: number): string {
  return MOOD_OPTIONS.find((option) => option.score === score)?.label ?? String(score);
}

function emojiForScore(score: number): string {
  return MOOD_OPTIONS.find((option) => option.score === score)?.emoji ?? '—';
}

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-600';

export default function MoodPage() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<WellnessBadge[]>([]);

  const entriesQuery = useQuery({
    queryKey: ['mood'],
    queryFn: async () => {
      const res = await apiClient.get<{ entries: MoodEntry[] }>('/mood');
      return res.data.entries;
    },
  });

  const { register, handleSubmit, watch, setValue, reset } = useForm<MoodFormValues>({
    defaultValues: emptyFormValues,
  });
  const selectedScore = watch('moodScore');

  const createMutation = useMutation({
    mutationFn: async (payload: MoodEntryInput) => {
      const res = await apiClient.post<{ entry: MoodEntry; newBadges: WellnessBadge[] }>(
        '/mood',
        payload,
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mood'] });
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
      await apiClient.delete(`/mood/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood'] });
    },
  });

  const onSubmit = (values: MoodFormValues) => {
    createMutation.mutate(formValuesToPayload(values));
  };

  const entries = entriesQuery.data ?? [];
  const chartData = entries.map((entry) => ({
    date: entry.recordedAt.slice(0, 10),
    moodScore: entry.moodScore,
  }));
  const sortedEntries = [...entries].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-8 shadow-sm shadow-slate-200/60">
        <h1 className="text-2xl font-bold">Mood tracking</h1>

        <div className="mt-4">
          <NewBadgeBanner badges={newBadges} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
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
            <span className={labelClass}>How are you feeling?</span>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Mood score">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.score}
                  type="button"
                  role="radio"
                  aria-checked={selectedScore === option.score}
                  onClick={() => setValue('moodScore', option.score)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm transition-colors ${
                    selectedScore === option.score
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200/70 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {option.emoji}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="note" className={labelClass}>
              Note (optional)
            </label>
            <input id="note" type="text" className={inputClass} {...register('note')} />
          </div>

          {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 font-semibold text-white shadow-sm shadow-teal-600/20 transition-all hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Saving...' : 'Log mood'}
          </button>
        </form>
      </section>

      {chartData.length > 1 && (
        <section className="rounded-3xl border border-slate-200/70 bg-white p-8 shadow-sm shadow-slate-200/60">
          <h2 className="text-lg font-semibold text-slate-700">Mood over time</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[1, 5]} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                  }}
                  formatter={(value) => [labelForScore(Number(value)), 'Mood']}
                />
                <Line type="monotone" dataKey="moodScore" stroke="#0d9488" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200/70 bg-white p-8 shadow-sm shadow-slate-200/60">
        <h2 className="text-lg font-semibold text-slate-700">Recent entries</h2>
        {entriesQuery.isLoading ? (
          <p className="mt-4 text-slate-600">Loading...</p>
        ) : sortedEntries.length === 0 ? (
          <p className="mt-4 text-slate-600">No moods logged yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Mood</th>
                  <th className="pb-2 pr-4">Note</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {sortedEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{entry.recordedAt.slice(0, 10)}</td>
                    <td className="py-2 pr-4">
                      {emojiForScore(entry.moodScore)} {labelForScore(entry.moodScore)}
                    </td>
                    <td className="py-2 pr-4">{entry.note ?? '—'}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        className="text-rose-600 transition-colors hover:text-rose-500"
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
