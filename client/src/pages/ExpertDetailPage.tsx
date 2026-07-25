import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Badge, Button, Card, Modal } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { Appointment } from '../types/appointment';
import type { AvailabilitySlot, ExpertDetail } from '../types/expert';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);

  const expertQuery = useQuery({
    queryKey: ['experts', id],
    queryFn: async () => {
      const res = await apiClient.get<{ expert: ExpertDetail }>(`/experts/${id}`);
      return res.data.expert;
    },
    enabled: Boolean(id),
  });

  const bookMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const res = await apiClient.post<{ appointment: Appointment }>('/appointments', {
        slotId,
        notes: notes.trim() || undefined,
      });
      return res.data.appointment;
    },
    onSuccess: () => {
      setSelectedSlot(null);
      setNotes('');
      setBookingError(null);
      queryClient.invalidateQueries({ queryKey: ['experts', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/appointments');
    },
    onError: (err) => {
      setBookingError(getErrorMessage(err, 'Unable to book this slot'));
    },
  });

  const closeModal = () => {
    setSelectedSlot(null);
    setNotes('');
    setBookingError(null);
  };

  if (expertQuery.isLoading) {
    return <p className="text-slate-600">Loading...</p>;
  }

  if (expertQuery.isError || !expertQuery.data) {
    return (
      <p className="text-sm text-rose-600">
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
            <p className="mt-1 text-sm font-medium text-teal-600">{expert.specialty}</p>
          </div>
          <Badge>{expert.user.role}</Badge>
        </div>
        <p className="mt-4 text-slate-600">{expert.bio}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Focus area</dt>
            <dd className="text-slate-700">{expert.focusArea}</dd>
          </div>
          {expert.credentials && (
            <div>
              <dt className="text-slate-500">Credentials</dt>
              <dd className="text-slate-700">{expert.credentials}</dd>
            </div>
          )}
          {expert.yearsExperience != null && (
            <div>
              <dt className="text-slate-500">Experience</dt>
              <dd className="text-slate-700">{expert.yearsExperience} years</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-700">Upcoming availability</h2>
        {!expert.isAcceptingBookings ? (
          <p className="mt-2 text-sm text-rose-600">This expert is not accepting bookings.</p>
        ) : expert.availabilitySlots.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No open slots right now.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {expert.availabilitySlots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50 p-4 text-sm text-slate-700"
              >
                {formatSlotTime(slot.startsAt, slot.endsAt)}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedSlot(slot)}
                  className="px-3 py-1 text-xs"
                >
                  Book
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedSlot && (
        <Modal title="Confirm booking" onClose={closeModal}>
          <p className="text-sm text-slate-600">
            {formatSlotTime(selectedSlot.startsAt, selectedSlot.endsAt)} with{' '}
            {expert.user.name ?? 'this expert'}
          </p>
          <label htmlFor="notes" className="mt-4 block text-sm font-medium text-slate-600">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {bookingError && <p className="mt-2 text-sm text-rose-600">{bookingError}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => bookMutation.mutate(selectedSlot.id)}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? 'Booking...' : 'Confirm booking'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
