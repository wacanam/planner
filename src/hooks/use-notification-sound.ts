'use client';

import { useNotificationSettings } from './use-notification-settings';

/**
 * Hook for notification sound controls, backed by Firebase Firestore settings.
 */
export function useNotificationSound() {
  const { soundEnabled, soundStyle, toggleSound, setSoundStyle, updateSettings, playPreview } =
    useNotificationSettings();

  const setSoundEnabled = (enabled: boolean) => {
    return updateSettings({ soundEnabled: enabled });
  };

  return {
    soundEnabled,
    soundStyle,
    toggleSound,
    setSoundEnabled,
    setSoundStyle,
    playPreview,
  };
}
