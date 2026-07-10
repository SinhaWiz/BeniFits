import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import ConversationPage from '../src/pages/ConversationPage';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        messages: [
          {
            id: 'msg1',
            conversationId: 'conv1',
            senderId: 'other-user',
            content: 'Hi, looking forward to the session!',
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }),
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderAtConversationRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/appointments/appt1/messages']}>
        <AuthProvider>
          <Routes>
            <Route path="/appointments/:id/messages" element={<ConversationPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ConversationPage', () => {
  it('renders message history and a send form', async () => {
    renderAtConversationRoute();

    expect(await screen.findByRole('heading', { name: /conversation/i })).toBeInTheDocument();
    expect(await screen.findByText(/looking forward to the session/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });
});
