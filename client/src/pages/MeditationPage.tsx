import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Modal } from '../components/ui';
import { NewBadgeBanner } from '../components/NewBadgeBanner';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { WellnessBadge } from '../types/gamification';
import {
  MEDITATION_CATEGORIES,
  type MeditationCategory,
  type MeditationLog,
  type MeditationLogInput,
  type MeditationSession,
} from '../types/meditation';

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function categoryLabel(category: string): string {
  return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

interface TimerModalProps {
  session: MeditationSession;
  onClose: () => void;
  onComplete: () => void;
  isSaving: boolean;
}

function TimerModal({ session, onClose, onComplete, isSaving }: TimerModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(session.durationMinutes * 60);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, secondsLeft]);

  const finished = secondsLeft === 0;

  return (
    <Modal title={session.title} onClose={onClose}>
      <div className="flex flex-col items-center gap-6 py-4">
        <p className="text-center text-sm text-slate-500">{session.description}</p>
        <div className="text-5xl font-bold tabular-nums text-teal-600">
          {formatSeconds(secondsLeft)}
        </div>
        {finished ? (
          <p className="text-sm text-emerald-600">Session complete.</p>
        ) : (
          <Button variant="secondary" onClick={() => setRunning((value) => !value)}>
            {running ? 'Pause' : 'Resume'}
          </Button>
        )}
        <Button onClick={onComplete} disabled={isSaving}>
          {isSaving ? 'Saving...' : finished ? 'Log completion' : 'Complete now'}
        </Button>
      </div>
    </Modal>
  );
}

export default function MeditationPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<MeditationCategory | 'ALL'>('ALL');
  const [activeSession, setActiveSession] = useState<MeditationSession | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<WellnessBadge[]>([]);

  const sessionsQuery = useQuery({
    queryKey: ['meditation', 'sessions', category],
    queryFn: async () => {
      const res = await apiClient.get<{ sessions: MeditationSession[] }>('/meditation/sessions', {
        params: category === 'ALL' ? undefined : { category },
      });
      return res.data.sessions;
    },
  });

  const logsQuery = useQuery({
    queryKey: ['meditation', 'logs'],
    queryFn: async () => {
      const res = await apiClient.get<{ logs: MeditationLog[] }>('/meditation/logs');
      return res.data.logs;
    },
  });

  const logMutation = useMutation({
    mutationFn: async (payload: MeditationLogInput) => {
      const res = await apiClient.post<{ log: MeditationLog; newBadges: WellnessBadge[] }>(
        '/meditation/logs',
        payload,
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meditation', 'logs'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'summary'] });
      setServerError(null);
      setNewBadges(data.newBadges);
      setActiveSession(null);
    },
    onError: (err) => {
      setServerError(getErrorMessage(err, 'Unable to log this session'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/meditation/logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meditation', 'logs'] });
    },
  });

  const sessions = sessionsQuery.data ?? [];
  const logs = logsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">Meditation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a guided session and follow along with the timer.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory('ALL')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              category === 'ALL'
                ? 'bg-teal-50 text-teal-700'
                : 'bg-slate-50 text-slate-600 hover:text-white'
            }`}
          >
            All
          </button>
          {MEDITATION_CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                category === option
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-slate-50 text-slate-600 hover:text-white'
              }`}
            >
              {categoryLabel(option)}
            </button>
          ))}
        </div>

        {serverError && <p className="mt-4 text-sm text-rose-600">{serverError}</p>}
        <div className="mt-4">
          <NewBadgeBanner badges={newBadges} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessionsQuery.isLoading ? (
            <p className="text-slate-600">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="text-slate-600">No sessions found.</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-slate-50 p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{session.title}</h3>
                    <Badge>{session.durationMinutes} min</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{categoryLabel(session.category)}</p>
                  <p className="mt-2 text-sm text-slate-500">{session.description}</p>
                </div>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setServerError(null);
                    setActiveSession(session);
                  }}
                >
                  Start
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-700">Recent sessions</h2>
        {logsQuery.isLoading ? (
          <p className="mt-4 text-slate-600">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="mt-4 text-slate-600">No meditation sessions logged yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Session</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Duration</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{log.completedOn.slice(0, 10)}</td>
                    <td className="py-2 pr-4">{log.session.title}</td>
                    <td className="py-2 pr-4">{categoryLabel(log.session.category)}</td>
                    <td className="py-2 pr-4">{log.durationMinutes} min</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(log.id)}
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
      </Card>

      {activeSession && (
        <TimerModal
          session={activeSession}
          onClose={() => setActiveSession(null)}
          isSaving={logMutation.isPending}
          onComplete={() =>
            logMutation.mutate({
              sessionId: activeSession.id,
              completedOn: todayDateInputValue(),
            })
          }
        />
      )}
    </div>
  );
}
