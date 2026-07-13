import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../lib/apiClient';
import {
  getCurrentSubscription,
  getPushStatus,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push';
import type { Notification } from '../types/notification';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<{ notifications: Notification[]; unreadCount: number }>(
        '/notifications',
      );
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const pushStatusQuery = useQuery({
    queryKey: ['push', 'status'],
    queryFn: getPushStatus,
    enabled: isPushSupported(),
  });

  const subscriptionQuery = useQuery({
    queryKey: ['push', 'subscription'],
    queryFn: async () => Boolean(await getCurrentSubscription()),
    enabled: isPushSupported(),
  });

  const togglePushMutation = useMutation({
    mutationFn: async () => {
      if (subscriptionQuery.data) {
        await unsubscribeFromPush();
      } else if (pushStatusQuery.data?.publicKey) {
        await subscribeToPush(pushStatusQuery.data.publicKey);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push', 'subscription'] });
    },
  });

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const canOfferPush = isPushSupported() && pushStatusQuery.data?.enabled;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative rounded-full px-3 py-2 text-sm text-slate-300 transition-colors hover:text-white"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-2xl">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-sm font-semibold text-slate-200">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs font-medium text-sky-400 hover:text-sky-300"
              >
                Mark all read
              </button>
            )}
          </div>

          {canOfferPush && (
            <button
              type="button"
              onClick={() => togglePushMutation.mutate()}
              disabled={togglePushMutation.isPending}
              className="mb-2 w-full rounded-lg border border-white/10 px-2 py-1.5 text-left text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white disabled:opacity-60"
            >
              {subscriptionQuery.data
                ? '🔕 Disable browser notifications'
                : '🔔 Enable browser notifications'}
            </button>
          )}

          {notifications.length === 0 ? (
            <p className="px-1 py-4 text-sm text-slate-400">No notifications yet.</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => !notification.read && markReadMutation.mutate(notification.id)}
                    className={`w-full rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                      notification.read
                        ? 'text-slate-400 hover:bg-white/5'
                        : 'bg-sky-500/10 text-slate-100 hover:bg-sky-500/20'
                    }`}
                  >
                    <p className="font-medium">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{notification.body}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
