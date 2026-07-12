import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WellnessPage from '../src/pages/WellnessPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        streak: 3,
        counts: { moodCount: 5, sleepCount: 2, meditationCount: 1 },
        badges: [
          {
            key: 'first-step',
            name: 'First Step',
            description: 'Logged your first wellness entry.',
            icon: '🌱',
            earned: true,
            earnedAt: new Date().toISOString(),
          },
          {
            key: 'streak-7',
            name: '7-Day Streak',
            description: 'Logged a wellness activity 7 days in a row.',
            icon: '🔥',
            earned: false,
            earnedAt: null,
          },
        ],
      },
    }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('WellnessPage', () => {
  it('renders the streak, counts, and earned/locked badges', async () => {
    renderWithProviders(<WellnessPage />);

    expect(await screen.findByRole('heading', { name: /wellness dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('First Step')).toBeInTheDocument();
    expect(screen.getByText('7-Day Streak')).toBeInTheDocument();
    expect(screen.getByText(/badges earned \(1\/2\)/i)).toBeInTheDocument();
  });
});
