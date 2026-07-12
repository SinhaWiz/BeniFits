import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MeditationPage from '../src/pages/MeditationPage';
import { renderWithProviders } from './testUtils';

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn((url: string) => {
      if (url.startsWith('/meditation/sessions')) {
        return Promise.resolve({
          data: {
            sessions: [
              {
                id: 'session1',
                title: 'Box Breathing',
                category: 'BREATHING',
                durationMinutes: 5,
                description: 'A calming breath exercise.',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { logs: [] } });
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../src/lib/apiClient', () => ({ apiClient: apiClientMock }));

describe('MeditationPage', () => {
  it('renders the session library and a start button', async () => {
    renderWithProviders(<MeditationPage />);

    expect(screen.getByRole('heading', { name: /meditation/i })).toBeInTheDocument();
    expect(await screen.findByText('Box Breathing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });
});
