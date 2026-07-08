import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import LoginPage from '../src/pages/LoginPage';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    get: vi.fn().mockRejectedValue(new Error('not authenticated')),
  },
}));

describe('LoginPage', () => {
  it('renders the login form fields', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });
});
