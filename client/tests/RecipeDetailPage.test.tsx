import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import RecipeDetailPage from '../src/pages/RecipeDetailPage';

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn((url: string) => {
      if (url.startsWith('/recipes/')) {
        return Promise.resolve({
          data: {
            recipe: {
              id: 1,
              title: 'Chicken Stir Fry',
              image: null,
              readyInMinutes: 30,
              servings: 4,
              sourceUrl: null,
              summary: 'A tasty stir fry.',
              ingredients: ['chicken', 'soy sauce'],
              instructions: ['Cook chicken', 'Add sauce'],
              calories: 450,
              proteinG: 35,
              fatG: 12,
              carbsG: 40,
            },
          },
        });
      }
      return Promise.resolve({ data: { plans: [] } });
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn(),
  },
}));

vi.mock('../src/lib/apiClient', () => ({ apiClient: apiClientMock }));

function renderAtDetailRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/recipes/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RecipeDetailPage', () => {
  it('renders the recipe and adds it to a new diet plan', async () => {
    const user = userEvent.setup();
    renderAtDetailRoute();

    expect(await screen.findByRole('heading', { name: /chicken stir fry/i })).toBeInTheDocument();
    expect(screen.getByText('chicken')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add to diet plan/i }));
    expect(await screen.findByRole('heading', { name: /add to diet plan/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(apiClientMock.post).toHaveBeenCalledWith(
      '/diet-plans',
      expect.objectContaining({
        title: 'Chicken Stir Fry',
        meals: [expect.objectContaining({ description: 'Chicken Stir Fry', calories: 450 })],
      }),
    );
  });
});
