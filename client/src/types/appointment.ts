export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  clientId: string;
  expertProfileId: string;
  slotId: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  slot: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: 'OPEN' | 'BOOKED' | 'CANCELLED';
  };
  expertProfile: {
    id: string;
    specialty: string;
    user: { id: string; name: string | null };
  };
  client: {
    id: string;
    name: string | null;
    email: string;
  };
}
