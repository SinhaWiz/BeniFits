import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecipesPage from '../src/pages/RecipesPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('RecipesPage', () => {
  it('renders the search box', () => {
    renderWithProviders(<RecipesPage />);

    expect(screen.getByRole('heading', { name: /recipes/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search a recipe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });
});
