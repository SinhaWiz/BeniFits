import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearchPage from '../src/pages/ResearchPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ResearchPage', () => {
  it('renders the search box', () => {
    renderWithProviders(<ResearchPage />);

    expect(screen.getByRole('heading', { name: /research summaries/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search research/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });
});
