import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import ProtectedRoute from '../src/components/ProtectedRoute';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: {
    post: vi.fn().mockRejectedValue(new Error('not authenticated')),
    get: vi.fn().mockRejectedValue(new Error('not authenticated')),
  },
}));

function ProtectedContent() {
  return <p>secret content</p>;
}

function LoginMarker() {
  return <p>login page</p>;
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginMarker />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProtectedContent />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });
});
