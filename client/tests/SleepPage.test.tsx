import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SleepPage from '../src/pages/SleepPage';
import { renderWithProviders } from './testUtils';

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn((url: string) => {
      if (url.startsWith('/sleep')) {
        return Promise.resolve({ data: { entries: [] } });
      }
      return Promise.resolve({ data: { profile: { sleepGoalHours: 8 } } });
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../src/lib/apiClient', () => ({ apiClient: apiClientMock }));

describe('SleepPage', () => {
  it('renders the log form and the sleep goal', async () => {
    renderWithProviders(<SleepPage />);

    expect(screen.getByRole('heading', { name: /sleep tools/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/bedtime/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/wake time/i)).toBeInTheDocument();
    expect(await screen.findByText(/8h/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log sleep/i })).toBeInTheDocument();
  });
});
