import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import UserProfilePage from '../src/pages/UserProfilePage';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url.startsWith('/users/')) {
        return Promise.resolve({
          data: {
            user: {
              id: 'u2',
              name: 'Bob Poster',
              role: 'USER',
              avatar: null,
              createdAt: new Date().toISOString(),
              followersCount: 3,
              followingCount: 1,
              postsCount: 1,
              isFollowedByMe: false,
            },
          },
        });
      }
      return Promise.resolve({
        data: {
          posts: [
            {
              id: 'post1',
              authorId: 'u2',
              author: { id: 'u2', name: 'Bob Poster', avatar: null, role: 'USER' },
              content: 'Meal prepped for the week.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              likesCount: 0,
              commentsCount: 0,
              likedByMe: false,
            },
          ],
          hasMore: false,
        },
      });
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

function renderAtProfileRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/users/u2']}>
        <AuthProvider>
          <Routes>
            <Route path="/users/:id" element={<UserProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UserProfilePage', () => {
  it('shows a follow button and posts when viewing someone else', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', email: 'viewer@example.com', name: 'Viewer', role: 'USER' },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAtProfileRoute();

    expect(await screen.findByRole('heading', { name: /bob poster/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^follow$/i })).toBeInTheDocument();
    expect(await screen.findByText('Meal prepped for the week.')).toBeInTheDocument();
  });

  it('hides the follow button on your own profile', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u2', email: 'bob@example.com', name: 'Bob Poster', role: 'USER' },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAtProfileRoute();

    expect(await screen.findByRole('heading', { name: /bob poster/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^follow$/i })).not.toBeInTheDocument();
  });
});
