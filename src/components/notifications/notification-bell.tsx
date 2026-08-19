'use client';

import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Inbox,
  Info,
  MapPin,
  MoreVertical,
  Music,
  RotateCcw,
  Settings,
  Share2,
  Shield,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationSettingsDialog } from '@/components/notifications/notification-settings-dialog';
import {
  useClearAllNotifications,
  useDeleteNotification,
  useMarkNotificationUnread,
  useMarkNotificationsRead,
  useNotificationSettings,
  useNotifications,
} from '@/hooks';
import {
  formatNotificationTime,
  getNotificationRoute,
  getNotificationVisuals,
} from '@/lib/notifications';

import type { Notification } from '@/types/api';

function NotificationIcon({ type }: { type: string }) {
  const visuals = getNotificationVisuals(type);
  switch (visuals.iconName) {
    case 'map-pin':
      return <MapPin size={15} />;
    case 'users':
      return <Users size={15} />;
    case 'share':
      return <Share2 size={15} />;
    case 'check-circle':
      return <Check size={15} />;
    case 'x-circle':
      return <XCircle size={15} />;
    case 'shield':
      return <Shield size={15} />;
    case 'info':
      return <Info size={15} />;
    default:
      return <Bell size={15} />;
  }
}

export function NotificationBell({ className = '' }: { className?: string }) {
  const router = useRouter();
  const params = useParams();
  const congregationId = (params?.id as string) || '';

  const { notifications = [], unreadCount = 0, isLoading } = useNotifications();
  const { markRead } = useMarkNotificationsRead();
  const { markUnread } = useMarkNotificationUnread();
  const { deleteNotification } = useDeleteNotification();
  const { clearAll } = useClearAllNotifications();
  const { soundEnabled, soundStyle, toggleSound, setSoundStyle, playPreview } =
    useNotificationSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markRead({ id: notif.id });
    }
    const targetRoute = getNotificationRoute(notif, congregationId);
    setIsOpen(false);
    if (targetRoute) {
      router.push(targetRoute);
    }
  };

  const handleMarkAllRead = async () => {
    await markRead();
  };

  const handleClearAll = async () => {
    await clearAll();
  };

  const fullNotificationsHref = congregationId
    ? `/congregation/${congregationId}/notifications`
    : '/profile';

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all focus-visible:outline-none cursor-pointer ${className}`}
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell size={19} className="transition-transform active:scale-95" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50 duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[calc(100vw-1.5rem)] sm:w-[400px] max-w-[400px] p-0 rounded-2xl border-border bg-popover shadow-xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1.5 font-bold bg-primary/15 text-primary"
                  >
                    {unreadCount} new
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    soundEnabled
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title={
                    soundEnabled
                      ? 'Notification sound enabled (click to mute)'
                      : 'Notification sound muted (click to enable)'
                  }
                  aria-label={
                    soundEnabled ? 'Mute notification sound' : 'Enable notification sound'
                  }
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>

                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} className="mr-1" />
                    Mark all read
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none cursor-pointer"
                      aria-label="Notification settings"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl p-1">
                    <DropdownMenuItem
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <CheckCheck size={14} />
                      <span>Mark all as read</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleClearAll}
                      disabled={notifications.length === 0}
                      className="text-xs text-destructive focus:text-destructive cursor-pointer gap-2"
                    >
                      <Trash2 size={14} />
                      <span>Clear all</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setIsOpen(false);
                        setSettingsOpen(true);
                      }}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <Settings size={14} />
                      <span>Notification Settings</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-1 flex items-center justify-between">
                      <span>Sound Style</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playPreview();
                        }}
                        className="text-primary hover:underline lowercase text-[10px] font-semibold cursor-pointer"
                      >
                        preview
                      </button>
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={soundStyle}
                      onValueChange={(val) => setSoundStyle(val as any)}
                    >
                      <DropdownMenuRadioItem value="chime" className="text-xs cursor-pointer">
                        Chime (Modern)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="ding" className="text-xs cursor-pointer">
                        Ding (Bell)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="pop" className="text-xs cursor-pointer">
                        Pop (Crisp)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="subtle" className="text-xs cursor-pointer">
                        Subtle (Warm)
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[min(380px,calc(100dvh-13rem))] overflow-y-auto divide-y divide-border/50 scrollbar-thin">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <Inbox size={20} />
                </div>
                <p className="text-xs font-bold text-foreground">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto">
                  {filter === 'unread'
                    ? "You're all caught up with your latest updates."
                    : 'Updates on territory assignments, endorsements, and shares will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const visuals = getNotificationVisuals(notif.type);
                const targetRoute = getNotificationRoute(notif, congregationId);
                const timeString = formatNotificationTime(notif.createdAt);

                return (
                  <div
                    key={notif.id}
                    className={`group relative flex items-start gap-3 p-3 transition-colors text-left hover:bg-muted/40 ${
                      !notif.isRead ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Visual Type Icon */}
                    <div
                      className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${visuals.colorClass}`}
                    >
                      <NotificationIcon type={notif.type} />
                    </div>

                    {/* Body Content */}
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none"
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-xs text-foreground tracking-tight line-clamp-1">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mb-1">
                        {notif.body}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-muted-foreground/80">
                          {timeString}
                        </span>
                        {visuals.badgeLabel && (
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            • {visuals.category}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Context Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      {notif.isRead ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markUnread(notif.id);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          title="Mark as unread"
                        >
                          <RotateCcw size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead({ id: notif.id });
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer"
                          title="Mark as read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-border bg-muted/20 text-center">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl"
                onClick={() => setIsOpen(false)}
              >
                <Link
                  href={fullNotificationsHref}
                  className="flex items-center justify-center gap-1.5"
                >
                  <span>View all notifications</span>
                  <ExternalLink size={12} />
                </Link>
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <NotificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
