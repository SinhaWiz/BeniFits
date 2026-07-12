import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import ChallengeDetailPage from '../src/pages/ChallengeDetailPage';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        challenge: {
          id: 'challenge1',
          title: 'Mood Check-In Challenge',
          description: 'Log your mood as many days as possible.',
          metric: 'MOOD_LOGS',
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 86400000 * 10).toISOString(),
          createdAt: new Date().toISOString(),
        },
        leaderboard: [
          { userId: 'u1', name: 'Alice', avatar: null, joinedAt: new Date().toISOString(), progress: 5, rank: 1 },
          { userId: 'u2', name: 'Bob', avatar: null, joinedAt: new Date().toISOString(), progress: 3, rank: 2 },
        ],
      },
    }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderAtDetailRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/challenges/challenge1']}>
        <AuthProvider>
          <Routes>
            <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChallengeDetailPage', () => {
  it('renders the challenge and a ranked leaderboard', async () => {
    renderAtDetailRoute();

    expect(
      await screen.findByRole('heading', { name: /mood check-in challenge/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });
});
