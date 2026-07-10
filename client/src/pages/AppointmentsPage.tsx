import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Badge, Button, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { Appointment, AppointmentStatus } from '../types/appointment';
import { EXPERT_ROLES } from '../types/expert';

type ViewRole = 'client' | 'expert';

function formatSlotTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const startLabel = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endLabel = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel}, ${startLabel} - ${endLabel}`;
}

const statusVariant: Record<AppointmentStatus, string> = {
  PENDING: 'text-amber-300',
  CONFIRMED: 'text-sky-300',
  CANCELLED: 'text-rose-400',
  COMPLETED: 'text-emerald-300',
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isExpert = Boolean(
    user && EXPERT_ROLES.includes(user.role as (typeof EXPERT_ROLES)[number]),
  );
  const [view, setView] = useState<ViewRole>('client');

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', view],
    queryFn: async () => {
      const res = await apiClient.get<{ appointments: Appointment[] }>('/appointments', {
        params: { role: view },
      });
      return res.data.appointments;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const res = await apiClient.patch<{ appointment: Appointment }>(`/appointments/${id}`, {
        status,
      });
      return res.data.appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['experts'] });
    },
  });

  const appointments = appointmentsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My appointments</h1>
        {isExpert && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={view === 'client' ? 'primary' : 'secondary'}
              onClick={() => setView('client')}
              className="px-3 py-1 text-sm"
            >
              As client
            </Button>
            <Button
              type="button"
              variant={view === 'expert' ? 'primary' : 'secondary'}
              onClick={() => setView('expert')}
              className="px-3 py-1 text-sm"
            >
              As expert
            </Button>
          </div>
        )}
      </div>

      {appointmentsQuery.isLoading ? (
        <p className="text-slate-300">Loading...</p>
      ) : appointmentsQuery.isError ? (
        <p className="text-sm text-rose-400">
          {getErrorMessage(appointmentsQuery.error, 'Unable to load appointments')}
        </p>
      ) : appointments.length === 0 ? (
        <p className="text-slate-300">No appointments yet.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const counterpart =
              view === 'client'
                ? (appointment.expertProfile.user.name ?? 'Expert')
                : (appointment.client.name ?? appointment.client.email);
            const active =
              appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';

            return (
              <Card key={appointment.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-100">{counterpart}</p>
                    <p className="text-sm text-slate-300">
                      {formatSlotTime(appointment.slot.startsAt, appointment.slot.endsAt)}
                    </p>
                    {view === 'client' && (
                      <p className="text-xs text-sky-300">{appointment.expertProfile.specialty}</p>
                    )}
                  </div>
                  <Badge className={statusVariant[appointment.status]}>
                    {appointment.status}
                  </Badge>
                </div>
                {appointment.notes && (
                  <p className="mt-2 text-sm text-slate-400">{appointment.notes}</p>
                )}
                {appointment.status !== 'CANCELLED' && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      to={`/appointments/${appointment.id}/messages`}
                      className="text-sm text-sky-300 hover:text-sky-200"
                    >
                      Message
                    </Link>
                    {view === 'expert' && appointment.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({ id: appointment.id, status: 'CONFIRMED' })
                        }
                        className="text-sm text-sky-300 hover:text-sky-200"
                      >
                        Confirm
                      </button>
                    )}
                    {view === 'expert' && appointment.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({ id: appointment.id, status: 'COMPLETED' })
                        }
                        className="text-sm text-emerald-300 hover:text-emerald-200"
                      >
                        Mark completed
                      </button>
                    )}
                    {active && (
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({ id: appointment.id, status: 'CANCELLED' })
                        }
                        className="text-sm text-rose-400 hover:text-rose-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
