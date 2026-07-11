import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NewsPage from '../src/pages/NewsPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        articles: [
          {
            title: 'New study on nutrition',
            description: 'A summary of the study.',
            url: 'https://example.com/article',
            imageUrl: null,
            source: 'Example News',
            publishedAt: new Date().toISOString(),
          },
        ],
      },
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('NewsPage', () => {
  it('loads the default feed on mount', async () => {
    renderWithProviders(<NewsPage />);

    expect(screen.getByRole('heading', { name: /health news/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search news/i)).toBeInTheDocument();

    expect(await screen.findByText('New study on nutrition')).toBeInTheDocument();
  });
});
