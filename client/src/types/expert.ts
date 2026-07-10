export type ExpertRole = 'NUTRITIONIST' | 'DOCTOR' | 'COACH';

export const EXPERT_ROLES: ExpertRole[] = ['NUTRITIONIST', 'DOCTOR', 'COACH'];

export interface ExpertUser {
  id: string;
  name: string | null;
  role: ExpertRole;
}

export interface ExpertSummary {
  id: string;
  specialty: string;
  focusArea: string;
  bio: string;
  credentials: string | null;
  yearsExperience: number | null;
  isAcceptingBookings: boolean;
  createdAt: string;
  user: ExpertUser;
}

export type SlotStatus = 'OPEN' | 'BOOKED' | 'CANCELLED';

export interface AvailabilitySlot {
  id: string;
  expertProfileId: string;
  startsAt: string;
  endsAt: string;
  status: SlotStatus;
  createdAt: string;
}

export interface ExpertDetail extends ExpertSummary {
  availabilitySlots: AvailabilitySlot[];
}

export interface ExpertProfile {
  id: string;
  userId: string;
  specialty: string;
  focusArea: string;
  bio: string;
  credentials: string | null;
  yearsExperience: number | null;
  isAcceptingBookings: boolean;
  createdAt: string;
  updatedAt: string;
}
