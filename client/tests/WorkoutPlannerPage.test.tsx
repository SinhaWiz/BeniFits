import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkoutPlannerPage from '../src/pages/WorkoutPlannerPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { plans: [] } }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('WorkoutPlannerPage', () => {
  it('renders the generate button', () => {
    renderWithProviders(<WorkoutPlannerPage />);

    expect(screen.getByRole('heading', { name: /workout planner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument();
  });
});
