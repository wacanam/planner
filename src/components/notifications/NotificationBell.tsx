'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Bell, UserPlus, CheckCircle, XCircle, X } from 'lucide-react';
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
  notifications: Notification[];
  unreadCount: number;
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'join_request':
      return <UserPlus size={16} className="text-amber-500" />;
    case 'join_approved':
      return <CheckCircle size={16} className="text-green-500" />;
    case 'join_rejected':
      return <XCircle size={16} className="text-red-500" />;
    default:
      return <Bell size={16} className="text-muted-foreground" />;
  }
}

function getViewLink(notification: Notification): string | null {
  if (notification.type === 'join_request' && notification.data) {
    try {
      const data = JSON.parse(notification.data);
      if (data.congregationId) {
        return `/congregation/${data.congregationId}/members?tab=requests`;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function NotificationList({
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAllAsRead,
  onClose,
}: {
  notifications: Notification[];
  unreadCount: number;
  onNotificationClick: (n: Notification) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">Notifications</span>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
          {/* Close button — shown on mobile bottom sheet */}
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[60vh] sm:max-h-96">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => {
            const viewLink = getViewLink(n);
            return (
              <button
                key={n.id}
                type="button"
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors',
                  !n.isRead && 'bg-primary/5'
                )}
                onClick={() => onNotificationClick(n)}
              >
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 shrink-0">
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                      {viewLink && (
                        <Link
                          href={viewLink}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-primary hover:underline shrink-0"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border text-center">
        <Link
          href="/notifications"
          className="text-xs text-primary hover:underline"
          onClick={onClose}
        >
          View all notifications
        </Link>
      </div>
    </>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await fetchWithAuth<NotificationsResponse>('/api/notifications');
      setNotifications(data.notifications.slice(0, 10));
      setUnreadCount(data.unreadCount);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click (desktop only)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Lock body scroll when bottom sheet is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const markAsRead = async (ids: string[]) => {
    try {
      await fetchWithAuth('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    } catch {
      // silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchWithAuth('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead([notification.id]);
    }
  };

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  const listProps = {
    notifications,
    unreadCount,
    onNotificationClick: handleNotificationClick,
    onMarkAllAsRead: markAllAsRead,
    onClose: () => setOpen(false),
  };

  const mobileSheet = open && typeof document !== 'undefined' && createPortal(
    <div className="sm:hidden fixed inset-0 z-[200] flex flex-col justify-end">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
        aria-label="Close notifications"
      />
      {/* Sheet — anchored to bottom of viewport */}
      <div className="relative bg-background rounded-t-2xl border-t border-border shadow-xl animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <NotificationList {...listProps} />
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {/* Bell button + desktop dropdown */}
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setOpen((o) => !o)}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-0.5 leading-none">
              {badgeLabel}
            </span>
          )}
        </Button>

        {/* Desktop dropdown */}
        {open && (
          <div className="hidden sm:block absolute right-0 mt-2 w-80 rounded-xl border border-border bg-background shadow-lg z-50 overflow-hidden">
            <NotificationList {...listProps} />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet — rendered in document.body via portal */}
      {mobileSheet}
    </>
  );
}
