import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AiWeightLossCoachPage from '../src/pages/AiWeightLossCoachPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { plans: [] } }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('AiWeightLossCoachPage', () => {
  it('renders the generate form', () => {
    renderWithProviders(<AiWeightLossCoachPage />);

    expect(screen.getByRole('heading', { name: /ai weight-loss coach/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/target weight/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument();
  });
});
