import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VideosPage from '../src/pages/VideosPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('VideosPage', () => {
  it('renders the search box', () => {
    renderWithProviders(<VideosPage />);

    expect(screen.getByRole('heading', { name: /^videos$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search videos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });
});
