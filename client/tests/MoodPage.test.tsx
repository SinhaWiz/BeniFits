import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MoodPage from '../src/pages/MoodPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { entries: [] } }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('MoodPage', () => {
  it('renders the mood picker and log form', () => {
    renderWithProviders(<MoodPage />);

    expect(screen.getByRole('heading', { name: /mood tracking/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /mood score/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log mood/i })).toBeInTheDocument();
  });
});
