import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DietPlannerPage from '../src/pages/DietPlannerPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { plans: [] } }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('DietPlannerPage', () => {
  it('renders the new plan form', () => {
    renderWithProviders(<DietPlannerPage />);

    expect(screen.getByRole('heading', { name: /new diet plan/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create plan/i })).toBeInTheDocument();
  });
});
