import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExpertsPage from '../src/pages/ExpertsPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        experts: [
          {
            id: 'exp1',
            specialty: 'Weight Management',
            focusArea: 'Sustainable fat loss',
            bio: 'Registered dietitian with a decade of experience.',
            credentials: 'RD',
            yearsExperience: 10,
            isAcceptingBookings: true,
            createdAt: new Date().toISOString(),
            user: { id: 'u1', name: 'Dr. Amina Rahman', role: 'NUTRITIONIST' },
          },
        ],
      },
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ExpertsPage', () => {
  it('renders the search form and expert list', async () => {
    renderWithProviders(<ExpertsPage />);

    expect(screen.getByRole('heading', { name: /find an expert/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/specialty/i)).toBeInTheDocument();

    expect(await screen.findByText('Dr. Amina Rahman')).toBeInTheDocument();
    expect(screen.getByText('Weight Management')).toBeInTheDocument();
  });
});
