// mobile/src/lib/sound.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import type { NotificationSoundStyle } from '@/types/api';

const SOUND_ENABLED_KEY = 'planner_notification_sound_enabled';
const SOUND_STYLE_KEY = 'planner_notification_sound_style';

export async function isNotificationSoundEnabled(): Promise<boolean> {
  try {
    const item = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    return item === null ? true : item === 'true';
  } catch {
    return true;
  }
}

export async function setNotificationSoundEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch (err) {
    console.error('Failed to save sound preference:', err);
  }
}

export async function getNotificationSoundStyle(): Promise<NotificationSoundStyle> {
  try {
    const item = (await AsyncStorage.getItem(SOUND_STYLE_KEY)) as NotificationSoundStyle | null;
    return item && ['chime', 'ding', 'subtle', 'pop'].includes(item) ? item : 'chime';
  } catch {
    return 'chime';
  }
}

export async function setNotificationSoundStyle(style: NotificationSoundStyle): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_STYLE_KEY, style);
  } catch (err) {
    console.error('Failed to save sound style:', err);
  }
}

/**
 * Triggers light haptic tactile feedback.
 */
export async function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) {
  try {
    switch (type) {
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'light':
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch {
    // Haptics not supported on device/web
  }
}

/**
 * Plays an in-app notification sound chime.
 */
export async function playNotificationSound(
  style?: NotificationSoundStyle,
  forcePlay = false
): Promise<void> {
  try {
    if (!forcePlay) {
      const enabled = await isNotificationSoundEnabled();
      if (!enabled) return;
    }

    await triggerHaptic('light');

    // Synthesized tone or alert sound via Audio
    // In Expo, sounds can be played or configured with Audio.Sound
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}
