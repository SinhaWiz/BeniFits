import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import AppointmentsPage from '../src/pages/AppointmentsPage';
import { renderWithProviders } from './testUtils';

const { sampleAppointment } = vi.hoisted(() => ({
  sampleAppointment: {
    id: 'appt1',
    clientId: 'u1',
    expertProfileId: 'exp1',
    slotId: 'slot1',
    status: 'PENDING',
    notes: 'Looking forward to it',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slot: {
      id: 'slot1',
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 90000000).toISOString(),
      status: 'BOOKED',
    },
    expertProfile: {
      id: 'exp1',
      specialty: 'Weight Management',
      user: { id: 'e1', name: 'Dr. Amina Rahman' },
    },
    client: { id: 'u1', name: 'Jamie Client', email: 'jamie@example.com' },
  },
}));

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { appointments: [sampleAppointment] } }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../src/auth/AuthContext', async () => {
  const actual =
    await vi.importActual<typeof import('../src/auth/AuthContext')>('../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

describe('AppointmentsPage', () => {
  it('lists the client’s own bookings', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', email: 'jamie@example.com', name: 'Jamie Client', role: 'USER' },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<AppointmentsPage />);

    expect(screen.getByRole('heading', { name: /my appointments/i })).toBeInTheDocument();
    expect(await screen.findByText('Dr. Amina Rahman')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /message/i })).toBeInTheDocument();
  });

  it('shows the client/expert view toggle for expert-role users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'e1', email: 'expert@example.com', name: 'Dr. Amina Rahman', role: 'NUTRITIONIST' },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<AppointmentsPage />);

    expect(await screen.findByRole('button', { name: /as client/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /as expert/i })).toBeInTheDocument();
  });
});
