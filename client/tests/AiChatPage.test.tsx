import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AiChatPage from '../src/pages/AiChatPage';
import { renderWithProviders } from './testUtils';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { messages: [] } }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
  baseURL: '/api',
}));

describe('AiChatPage', () => {
  it('renders the chat input', () => {
    renderWithProviders(<AiChatPage />);

    expect(screen.getByRole('heading', { name: /ai nutritionist/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask a nutrition question/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^send$/i })).toBeInTheDocument();
  });
});
