'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithAuth } from '@/lib/api-client';
import { timeAgo } from '@/lib/time-ago';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'join_request':
      return <UserPlus size={18} className="text-amber-500" />;
    case 'join_approved':
      return <CheckCircle size={18} className="text-green-500" />;
    case 'join_rejected':
      return <XCircle size={18} className="text-red-500" />;
    default:
      return <Bell size={18} className="text-muted-foreground" />;
  }
}

function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const n of notifications) {
    const t = new Date(n.createdAt).getTime();
    if (t >= today) groups.Today.push(n);
    else if (t >= yesterday) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  }

  return groups;
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await fetchWithAuth<NotificationsResponse>('/api/notifications');
      setNotifications(data.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetchWithAuth('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchWithAuth('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-9 w-56 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-32 rounded-full bg-muted animate-pulse" />
        </div>
        {/* Group label */}
        <div className="h-3 w-12 rounded bg-muted animate-pulse mb-3" />
        {/* Cards */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 w-full">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
                <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
                <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
                <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded bg-muted animate-pulse shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Notifications</h1>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Bell size={40} className="opacity-30" />
          <p className="text-sm">No notifications yet</p>
        </div>
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.isRead);
  const groups = groupByDate(notifications);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {hasUnread && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {(Object.entries(groups) as [string, Notification[]][])
        .filter(([, items]) => items.length > 0)
        .map(([group, items]) => (
          <div key={group}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group}
            </h2>
            <div className="space-y-2">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-4 items-start rounded-xl border border-border p-4 transition-colors',
                    !n.isRead && 'bg-primary/5 border-primary/20'
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()} · {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => markAsRead(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
