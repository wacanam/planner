'use client';

import {
  Bell,
  Check,
  CheckCircle2,
  Cloud,
  FileText,
  KeyRound,
  MapPin,
  Music,
  Share2,
  Shield,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useNotificationSettings } from '@/hooks/use-notification-settings';
import type { NotificationSoundStyle } from '@/types/api';

interface NotificationSettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function NotificationSettingsDialog({
  open,
  onOpenChange,
  trigger,
}: NotificationSettingsDialogProps) {
  const {
    settings,
    soundEnabled,
    soundStyle,
    isUpdating,
    updateSettings,
    toggleSound,
    setSoundStyle,
    playPreview,
  } = useNotificationSettings();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const handleToggleCategory = async (
    key:
      | 'territoryUpdates'
      | 'shareUpdates'
      | 'membershipUpdates'
      | 'accountUpdates'
      | 'systemAnnouncements',
    checked: boolean
  ) => {
    try {
      await updateSettings({ [key]: checked });
      toast.success('Notification preferences updated.');
    } catch {
      toast.error('Failed to update notification preferences.');
    }
  };

  const handleSoundStyleChange = async (style: string) => {
    try {
      await setSoundStyle(style as NotificationSoundStyle);
      toast.success(`Sound changed to ${style}.`);
    } catch {
      toast.error('Failed to change sound style.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden border-border bg-card">
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/30">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Notification Preferences
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure in-app notification alerts and audio chime preferences. Changes are saved to
              your Firebase cloud account.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Audio Chime Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sound Alerts
                </p>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 h-4 border-primary/30 text-primary"
                >
                  Cloud Sync
                </Badge>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="sound-switch"
                      className="font-semibold text-xs text-foreground cursor-pointer"
                    >
                      Play Audio Sound
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Play a gentle chime when new notifications arrive in real-time.
                  </p>
                </div>
                <Switch
                  id="sound-switch"
                  checked={soundEnabled}
                  onCheckedChange={toggleSound}
                  disabled={isUpdating}
                />
              </div>

              {soundEnabled && (
                <div className="pt-2.5 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">Chime Style</span>
                    <p className="text-[11px] text-muted-foreground">
                      Select your preferred synthesizer chime profile.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={soundStyle}
                      onValueChange={handleSoundStyleChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-8 w-[130px] rounded-xl text-xs">
                        <SelectValue placeholder="Style" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="chime" className="text-xs">
                          Chime (Modern)
                        </SelectItem>
                        <SelectItem value="ding" className="text-xs">
                          Ding (Bell)
                        </SelectItem>
                        <SelectItem value="pop" className="text-xs">
                          Pop (Crisp)
                        </SelectItem>
                        <SelectItem value="subtle" className="text-xs">
                          Subtle (Warm)
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => playPreview(soundStyle as NotificationSoundStyle)}
                      className="h-8 px-2.5 rounded-xl text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                      title="Test sound"
                    >
                      <Volume2 size={13} className="mr-1" />
                      Test
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Categories */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notification Categories
            </p>

            <div className="space-y-2.5">
              {/* Territory Updates */}
              <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin size={14} />
                  </div>
                  <div className="min-w-0">
                    <Label
                      htmlFor="cat-territory"
                      className="text-xs font-semibold text-foreground block cursor-pointer"
                    >
                      Territories & Assignments
                    </Label>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      Approvals, endorsements, rejections & returns
                    </span>
                  </div>
                </div>
                <Switch
                  id="cat-territory"
                  checked={settings.territoryUpdates}
                  onCheckedChange={(checked) => handleToggleCategory('territoryUpdates', checked)}
                  disabled={isUpdating}
                />
              </div>

              {/* Sharing Updates */}
              <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Share2 size={14} />
                  </div>
                  <div className="min-w-0">
                    <Label
                      htmlFor="cat-share"
                      className="text-xs font-semibold text-foreground block cursor-pointer"
                    >
                      Record Sharing
                    </Label>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      Household share requests, acceptances & declines
                    </span>
                  </div>
                </div>
                <Switch
                  id="cat-share"
                  checked={settings.shareUpdates}
                  onCheckedChange={(checked) => handleToggleCategory('shareUpdates', checked)}
                  disabled={isUpdating}
                />
              </div>

              {/* Membership Updates */}
              <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Users size={14} />
                  </div>
                  <div className="min-w-0">
                    <Label
                      htmlFor="cat-membership"
                      className="text-xs font-semibold text-foreground block cursor-pointer"
                    >
                      Membership & Access
                    </Label>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      Join requests, reviews & role updates
                    </span>
                  </div>
                </div>
                <Switch
                  id="cat-membership"
                  checked={settings.membershipUpdates}
                  onCheckedChange={(checked) => handleToggleCategory('membershipUpdates', checked)}
                  disabled={isUpdating}
                />
              </div>

              {/* Account Updates */}
              <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Shield size={14} />
                  </div>
                  <div className="min-w-0">
                    <Label
                      htmlFor="cat-account"
                      className="text-xs font-semibold text-foreground block cursor-pointer"
                    >
                      Account & Requests
                    </Label>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      Leave requests & account status updates
                    </span>
                  </div>
                </div>
                <Switch
                  id="cat-account"
                  checked={settings.accountUpdates}
                  onCheckedChange={(checked) => handleToggleCategory('accountUpdates', checked)}
                  disabled={isUpdating}
                />
              </div>
            </div>
          </div>

          {/* Cloud Sync Notice */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2.5 text-xs text-muted-foreground">
            <Cloud size={16} className="text-primary shrink-0" />
            <span>
              Preferences are saved in your account on Firebase Firestore and automatically
              synchronize across your phone, tablet, and desktop.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
