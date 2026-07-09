import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NutritionPage from '../src/pages/NutritionPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('NutritionPage', () => {
  it('renders the search box', () => {
    renderWithProviders(<NutritionPage />);

    expect(screen.getByRole('heading', { name: /nutrition calculator/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search a food/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });
});
