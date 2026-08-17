import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getNotificationSoundStyle,
  isNotificationSoundEnabled,
  playNotificationSound,
  setNotificationSoundEnabled,
  setNotificationSoundStyle,
} from '@/lib/sound';

describe('Sound Utilities', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    (globalThis as any).window = {
      localStorage: storageMock,
      AudioContext: class {
        state = 'running';
        currentTime = 0;
        destination = {};
        createOscillator() {
          return {
            type: 'sine',
            frequency: {
              setValueAtTime: () => undefined,
              linearRampToValueAtTime: () => undefined,
              exponentialRampToValueAtTime: () => undefined,
            },
            connect: () => undefined,
            start: () => undefined,
            stop: () => undefined,
          };
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: () => undefined,
              linearRampToValueAtTime: () => undefined,
              exponentialRampToValueAtTime: () => undefined,
            },
            connect: () => undefined,
          };
        }
        resume() {
          return Promise.resolve();
        }
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  describe('isNotificationSoundEnabled & setNotificationSoundEnabled', () => {
    it('defaults to true when unset', () => {
      expect(isNotificationSoundEnabled()).toBe(true);
    });

    it('saves and reads boolean sound preference', () => {
      setNotificationSoundEnabled(false);
      expect(isNotificationSoundEnabled()).toBe(false);

      setNotificationSoundEnabled(true);
      expect(isNotificationSoundEnabled()).toBe(true);
    });
  });

  describe('getNotificationSoundStyle & setNotificationSoundStyle', () => {
    it('defaults to chime when unset', () => {
      expect(getNotificationSoundStyle()).toBe('chime');
    });

    it('saves and retrieves valid sound styles', () => {
      setNotificationSoundStyle('ding');
      expect(getNotificationSoundStyle()).toBe('ding');

      setNotificationSoundStyle('pop');
      expect(getNotificationSoundStyle()).toBe('pop');

      setNotificationSoundStyle('subtle');
      expect(getNotificationSoundStyle()).toBe('subtle');
    });

    it('falls back to chime if invalid value stored in localStorage', () => {
      (globalThis as any).window.localStorage.setItem(
        'planner_notification_sound_style',
        'invalid_style_name'
      );
      expect(getNotificationSoundStyle()).toBe('chime');
    });
  });

  describe('playNotificationSound', () => {
    it('does not throw when called with various sound styles', () => {
      expect(() => playNotificationSound('chime')).not.toThrow();
      expect(() => playNotificationSound('ding', true)).not.toThrow();
      expect(() => playNotificationSound('pop')).not.toThrow();
      expect(() => playNotificationSound('subtle')).not.toThrow();
    });

    it('respects sound disabled setting unless forcePlay is true', () => {
      setNotificationSoundEnabled(false);
      expect(() => playNotificationSound('chime', false)).not.toThrow();
    });

    it('handles SSR gracefully when window is undefined', () => {
      delete (globalThis as any).window;
      expect(() => playNotificationSound('chime')).not.toThrow();
      expect(isNotificationSoundEnabled()).toBe(true);
      expect(getNotificationSoundStyle()).toBe('chime');
    });
  });
});
