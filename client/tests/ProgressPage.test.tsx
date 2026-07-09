import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProgressPage from '../src/pages/ProgressPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { entries: [] } }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ProgressPage', () => {
  it('renders the log entry form', () => {
    renderWithProviders(<ProgressPage />);

    expect(screen.getByRole('heading', { name: /progress tracking/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log entry/i })).toBeInTheDocument();
  });
});
