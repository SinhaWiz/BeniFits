import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { Badge, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { ExpertDetail } from '../types/expert';

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

export default function ExpertDetailPage() {
  const { id } = useParams<{ id: string }>();

  const expertQuery = useQuery({
    queryKey: ['experts', id],
    queryFn: async () => {
      const res = await apiClient.get<{ expert: ExpertDetail }>(`/experts/${id}`);
      return res.data.expert;
    },
    enabled: Boolean(id),
  });

  if (expertQuery.isLoading) {
    return <p className="text-slate-300">Loading...</p>;
  }

  if (expertQuery.isError || !expertQuery.data) {
    return (
      <p className="text-sm text-rose-400">
        {getErrorMessage(expertQuery.error, 'Unable to load this expert')}
      </p>
    );
  }

  const expert = expertQuery.data;

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{expert.user.name ?? 'Expert'}</h1>
            <p className="mt-1 text-sm font-medium text-sky-300">{expert.specialty}</p>
          </div>
          <Badge>{expert.user.role}</Badge>
        </div>
        <p className="mt-4 text-slate-300">{expert.bio}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Focus area</dt>
            <dd className="text-slate-200">{expert.focusArea}</dd>
          </div>
          {expert.credentials && (
            <div>
              <dt className="text-slate-400">Credentials</dt>
              <dd className="text-slate-200">{expert.credentials}</dd>
            </div>
          )}
          {expert.yearsExperience != null && (
            <div>
              <dt className="text-slate-400">Experience</dt>
              <dd className="text-slate-200">{expert.yearsExperience} years</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-200">Upcoming availability</h2>
        {!expert.isAcceptingBookings ? (
          <p className="mt-2 text-sm text-rose-400">This expert is not accepting bookings.</p>
        ) : expert.availabilitySlots.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300">No open slots right now.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {expert.availabilitySlots.map((slot) => (
              <li
                key={slot.id}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200"
              >
                {formatSlotTime(slot.startsAt, slot.endsAt)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
