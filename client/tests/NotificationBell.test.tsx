import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotificationBell } from '../src/components/NotificationBell';
import { renderWithProviders } from './testUtils';

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn().mockResolvedValue({
      data: {
        notifications: [
          {
            id: 'n1',
            userId: 'u1',
            type: 'BADGE_EARNED',
            title: 'New badge: First Step',
            body: 'Logged your first wellness entry.',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        hasMore: false,
      },
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../src/lib/apiClient', () => ({ apiClient: apiClientMock }));

describe('NotificationBell', () => {
  it('shows the unread count and opens a dropdown with notifications', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    expect(await screen.findByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByText('New badge: First Step')).toBeInTheDocument();
    expect(screen.getByText('Logged your first wellness entry.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
  });

  it('marks a notification as read on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    const notificationButton = await screen.findByText('New badge: First Step');
    await user.click(notificationButton);

    expect(apiClientMock.post).toHaveBeenCalledWith('/notifications/n1/read');
  });
});
