import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FeedPage from '../src/pages/FeedPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        posts: [
          {
            id: 'post1',
            authorId: 'u1',
            author: { id: 'u1', name: 'Alice', avatar: null, role: 'USER' },
            content: 'Just finished a 5k run!',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            likesCount: 2,
            commentsCount: 1,
            likedByMe: false,
          },
        ],
        hasMore: false,
      },
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FeedPage', () => {
  it('renders the composer, scope tabs, and feed posts', async () => {
    renderWithProviders(<FeedPage />);

    expect(screen.getByRole('heading', { name: /community feed/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/share a win/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discover/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /following/i })).toBeInTheDocument();

    expect(await screen.findByText('Just finished a 5k run!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /alice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /like \(2\)/i })).toBeInTheDocument();
  });
});
