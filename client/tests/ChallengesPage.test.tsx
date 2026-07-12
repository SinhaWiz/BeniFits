import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChallengesPage from '../src/pages/ChallengesPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        challenges: [
          {
            id: 'challenge1',
            title: 'Mood Check-In Challenge',
            description: 'Log your mood as many days as possible.',
            metric: 'MOOD_LOGS',
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 86400000 * 10).toISOString(),
            createdAt: new Date().toISOString(),
            participantCount: 4,
            joined: false,
          },
        ],
      },
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ChallengesPage', () => {
  it('renders a challenge with a join button and leaderboard link', async () => {
    renderWithProviders(<ChallengesPage />);

    expect(screen.getByRole('heading', { name: /challenges/i })).toBeInTheDocument();
    expect(await screen.findByText('Mood Check-In Challenge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view leaderboard/i })).toBeInTheDocument();
  });
});
