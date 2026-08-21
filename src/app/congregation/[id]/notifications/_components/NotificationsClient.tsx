'use client';

import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Filter,
  Inbox,
  Info,
  MapPin,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Shield,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { NotificationSettingsDialog } from '@/components/notifications/notification-settings-dialog';
import { ProtectedPage } from '@/components/protected-page';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useClearAllNotifications,
  useDeleteNotification,
  useMarkNotificationsRead,
  useMarkNotificationUnread,
  useNotificationSound,
  useNotifications,
} from '@/hooks';

import {
  formatNotificationTime,
  getNotificationRoute,
  getNotificationVisuals,
} from '@/lib/notifications';
import type { Notification } from '@/types/api';

function NotificationTypeIcon({ type }: { type: string }) {
  const visuals = getNotificationVisuals(type);
  switch (visuals.iconName) {
    case 'map-pin':
      return <MapPin size={18} />;
    case 'users':
      return <Users size={18} />;
    case 'share':
      return <Share2 size={18} />;
    case 'check-circle':
      return <Check size={18} />;
    case 'x-circle':
      return <XCircle size={18} />;
    case 'shield':
      return <Shield size={18} />;
    case 'info':
      return <Info size={18} />;
    default:
      return <Bell size={18} />;
  }
}

type CategoryFilter = 'all' | 'unread' | 'territory' | 'sharing' | 'membership' | 'account';

export default function NotificationsClient() {
  const params = useParams();
  const router = useRouter();
  const congregationId = (params?.id as string) || '';

  const { notifications = [], unreadCount = 0, isLoading } = useNotifications();
  const { markRead } = useMarkNotificationsRead();
  const { markUnread } = useMarkNotificationUnread();
  const { deleteNotification } = useDeleteNotification();
  const { clearAll } = useClearAllNotifications();
  const { soundEnabled, toggleSound } = useNotificationSound();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Category filter
      if (selectedCategory === 'unread' && notif.isRead) return false;
      if (selectedCategory !== 'all' && selectedCategory !== 'unread') {
        const visuals = getNotificationVisuals(notif.type);
        if (visuals.category.toLowerCase() !== selectedCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = notif.title.toLowerCase().includes(q);
        const matchesBody = notif.body.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody) return false;
      }

      return true;
    });
  }, [notifications, selectedCategory, searchQuery]);

  const handleCardClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markRead({ id: notif.id });
    }
    const targetRoute = getNotificationRoute(notif, congregationId);
    if (targetRoute) {
      router.push(targetRoute);
    }
  };

  return (
    <ProtectedPage>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        {/* Page Header */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0"
              onClick={() => router.back()}
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
                {unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Stay updated on territory endorsements, approvals, requests, and activity
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSound}
              className={`h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer ${
                soundEnabled
                  ? 'text-primary border-primary/30 hover:bg-primary/10'
                  : 'text-muted-foreground border-border hover:bg-muted'
              }`}
              title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
              aria-label={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              title="Notification preferences & settings"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Preferences</span>
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markRead()}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer text-primary border-primary/30 hover:bg-primary/10"
              >
                <CheckCheck size={14} />
                <span>Mark all as read</span>
              </Button>
            )}

            {notifications.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                    <span>Clear all</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base font-bold">
                      Clear all notifications?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground">
                      This will permanently remove all your notifications from the list. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-xs font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearAll()}
                      className="rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Filter Toolbar & Search */}
        <div className="space-y-3 bg-card border border-border p-3.5 sm:p-4 rounded-2xl shadow-xs">
          {/* Search bar */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-background border-border"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-medium">
            <Filter size={13} className="text-muted-foreground mr-1 shrink-0 hidden sm:inline" />
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'unread'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('territory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'territory'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Territories
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('sharing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'sharing'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Record Shares
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('membership')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'membership'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Membership
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('account')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'account'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Account
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5">
          {isLoading && notifications.length === 0 ? (
            <Card className="rounded-2xl border-border bg-card p-12 text-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Loading notifications...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Syncing with your congregation records
              </p>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card className="rounded-3xl border-border bg-card p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Inbox size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">No notifications found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  {searchQuery
                    ? `No notifications matching "${searchQuery}". Try a different search term.`
                    : selectedCategory === 'unread'
                      ? "You've caught up with all your unread notifications."
                      : 'You do not have any notifications in this category yet.'}
                </p>
              </div>
              {selectedCategory !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="rounded-xl text-xs mt-2"
                >
                  Show all notifications
                </Button>
              )}
            </Card>
          ) : (
            filteredNotifications.map((notif) => {
              const visuals = getNotificationVisuals(notif.type);
              const targetRoute = getNotificationRoute(notif, congregationId);
              const timeString = formatNotificationTime(notif.createdAt);

              return (
                <Card
                  key={notif.id}
                  className={`group relative rounded-2xl border transition-all duration-150 overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-xs ${
                    !notif.isRead
                      ? 'bg-primary/5 border-primary/30 shadow-2xs'
                      : 'bg-card border-border'
                  }`}
                  onClick={() => handleCardClick(notif)}
                >
                  <CardContent className="p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4">
                    {/* Visual Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${visuals.colorClass}`}
                    >
                      <NotificationTypeIcon type={notif.type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm text-foreground tracking-tight">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <Badge className="bg-primary text-primary-foreground font-bold px-1.5 py-0 text-[9px] h-4">
                            New
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold text-muted-foreground border-border/80"
                        >
                          {visuals.category}
                        </Badge>
                      </div>

                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed mb-2 font-normal">
                        {notif.body}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="text-[11px] font-medium">{timeString}</span>
                        {targetRoute && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary group-hover:underline">
                            <span>Open details</span>
                            <ChevronRight size={12} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {notif.isRead ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markUnread(notif.id);
                          }}
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Mark as unread"
                          aria-label="Mark as unread"
                        >
                          <RotateCcw size={14} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead({ id: notif.id });
                          }}
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <Check size={14} />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
      <NotificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <BottomTabBar />
    </ProtectedPage>
  );
}
