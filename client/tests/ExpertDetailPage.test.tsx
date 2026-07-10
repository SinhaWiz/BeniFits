import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import ExpertDetailPage from '../src/pages/ExpertDetailPage';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        expert: {
          id: 'exp1',
          specialty: 'Weight Management',
          focusArea: 'Sustainable fat loss',
          bio: 'Registered dietitian with a decade of experience.',
          credentials: 'RD',
          yearsExperience: 10,
          isAcceptingBookings: true,
          createdAt: new Date().toISOString(),
          user: { id: 'u1', name: 'Dr. Amina Rahman', role: 'NUTRITIONIST' },
          availabilitySlots: [
            {
              id: 'slot1',
              expertProfileId: 'exp1',
              startsAt: new Date(Date.now() + 86400000).toISOString(),
              endsAt: new Date(Date.now() + 90000000).toISOString(),
              status: 'OPEN',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderAtDetailRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/experts/exp1']}>
        <AuthProvider>
          <Routes>
            <Route path="/experts/:id" element={<ExpertDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ExpertDetailPage', () => {
  it('renders the expert profile and a bookable slot', async () => {
    renderAtDetailRoute();

    expect(await screen.findByRole('heading', { name: /dr\. amina rahman/i })).toBeInTheDocument();
    expect(screen.getByText('Weight Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book/i })).toBeInTheDocument();
  });
});
