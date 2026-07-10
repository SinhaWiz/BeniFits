import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import ExpertDashboardPage from '../src/pages/ExpertDashboardPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url === '/experts/me/slots') return Promise.resolve({ data: { slots: [] } });
      return Promise.resolve({ data: { profile: null } });
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../src/auth/AuthContext', async () => {
  const actual =
    await vi.importActual<typeof import('../src/auth/AuthContext')>('../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

describe('ExpertDashboardPage', () => {
  it('shows a gated message for non-expert users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', email: 'user@example.com', name: 'Regular User', role: 'USER' },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<ExpertDashboardPage />);

    expect(screen.getByText(/only available to registered experts/i)).toBeInTheDocument();
  });

  it('renders the profile and availability forms for expert users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u2', email: 'expert@example.com', name: 'Dr. Expert', role: 'NUTRITIONIST' },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<ExpertDashboardPage />);

    expect(screen.getByRole('heading', { name: /expert dashboard/i })).toBeInTheDocument();
    expect(await screen.findByLabelText(/specialty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/focus area/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add slot/i })).toBeInTheDocument();
  });
});
