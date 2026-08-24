import { describe, expect, it } from 'vitest';
import {
  FORMS_SHORTCUTS,
  isInputElement,
  matchesShortcut,
  RECORDS_SHORTCUTS,
  STUDIO_SHORTCUTS,
} from '@/lib/keyboard-shortcuts';

function createKeyboardEvent(
  key: string,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; shiftKey?: boolean } = {}
): KeyboardEvent {
  return {
    key,
    ctrlKey: Boolean(modifiers.ctrlKey),
    metaKey: Boolean(modifiers.metaKey),
    altKey: Boolean(modifiers.altKey),
    shiftKey: Boolean(modifiers.shiftKey),
  } as KeyboardEvent;
}

describe('Keyboard Shortcuts Utilities', () => {
  describe('isInputElement', () => {
    it('returns false for null / undefined', () => {
      expect(isInputElement(null)).toBe(false);
      expect(isInputElement(undefined)).toBe(false);
    });

    it('returns true for HTMLInputElement', () => {
      const el = { tagName: 'INPUT', isContentEditable: false } as HTMLElement;
      expect(isInputElement(el)).toBe(true);
    });

    it('returns true for HTMLTextAreaElement', () => {
      const el = { tagName: 'TEXTAREA', isContentEditable: false } as HTMLElement;
      expect(isInputElement(el)).toBe(true);
    });

    it('returns true for HTMLSelectElement', () => {
      const el = { tagName: 'SELECT', isContentEditable: false } as HTMLElement;
      expect(isInputElement(el)).toBe(true);
    });

    it('returns true for contenteditable elements', () => {
      const el = { tagName: 'DIV', isContentEditable: true } as HTMLElement;
      expect(isInputElement(el)).toBe(true);
    });

    it('returns false for regular buttons and divs', () => {
      const div = { tagName: 'DIV', isContentEditable: false } as HTMLElement;
      const button = { tagName: 'BUTTON', isContentEditable: false } as HTMLElement;
      expect(isInputElement(div)).toBe(false);
      expect(isInputElement(button)).toBe(false);
    });
  });

  describe('matchesShortcut', () => {
    it('matches single character keys case-insensitively', () => {
      const eventV = createKeyboardEvent('v');
      const eventUpperV = createKeyboardEvent('V');
      const eventB = createKeyboardEvent('b');

      expect(matchesShortcut(eventV, 'v')).toBe(true);
      expect(matchesShortcut(eventV, 'V')).toBe(true);
      expect(matchesShortcut(eventUpperV, 'v')).toBe(true);
      expect(matchesShortcut(eventUpperV, 'V')).toBe(true);
      expect(matchesShortcut(eventB, 'v')).toBe(false);
    });

    it('matches number keys', () => {
      const event1 = createKeyboardEvent('1');
      const event2 = createKeyboardEvent('2');

      expect(matchesShortcut(event1, '1')).toBe(true);
      expect(matchesShortcut(event2, '1')).toBe(false);
    });

    it('matches special keys (Enter, Escape, Delete, Backspace)', () => {
      expect(matchesShortcut(createKeyboardEvent('Enter'), 'Enter')).toBe(true);
      expect(matchesShortcut(createKeyboardEvent('Escape'), 'Escape')).toBe(true);
      expect(matchesShortcut(createKeyboardEvent('Delete'), 'Delete')).toBe(true);
      expect(matchesShortcut(createKeyboardEvent('Backspace'), 'Backspace')).toBe(true);
      expect(matchesShortcut(createKeyboardEvent('Tab'), 'Enter')).toBe(false);
    });

    it('matches symbol keys (?, +, -, /, [)', () => {
      expect(matchesShortcut(createKeyboardEvent('?'), '?')).toBe(true);
      expect(matchesShortcut(createKeyboardEvent('/'), '/')).toBe(true);
      expect(matchesShortcut(createKeyboardEvent('+'), '+')).toBe(true);
      expect(matchesShortcut(createKeyboardEvent('-'), '-')).toBe(true);
      expect(matchesShortcut(createKeyboardEvent('['), '[')).toBe(true);
    });

    it('matches modifier combinations (Ctrl+z, Alt+p, Shift+?)', () => {
      const ctrlZ = createKeyboardEvent('z', { ctrlKey: true });
      const plainZ = createKeyboardEvent('z');
      const altP = createKeyboardEvent('p', { altKey: true });
      const shiftSlash = createKeyboardEvent('?', { shiftKey: true });

      expect(matchesShortcut(ctrlZ, 'Ctrl+z')).toBe(true);
      expect(matchesShortcut(plainZ, 'Ctrl+z')).toBe(false);
      expect(matchesShortcut(altP, 'Alt+p')).toBe(true);
      expect(matchesShortcut(shiftSlash, 'Shift+?')).toBe(true);
    });

    it('resolves Mod to Ctrl on Windows / Linux and Meta on macOS', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(globalThis.navigator, 'platform');
      const originalUserAgent = Object.getOwnPropertyDescriptor(globalThis.navigator, 'userAgent');

      // 1. Non-Mac platform (Windows / Linux)
      Object.defineProperty(globalThis.navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Windows',
        configurable: true,
      });
      const ctrlEnter = createKeyboardEvent('Enter', { ctrlKey: true });
      const metaEnter = createKeyboardEvent('Enter', { metaKey: true });
      const plainEnter = createKeyboardEvent('Enter');

      expect(matchesShortcut(ctrlEnter, 'Mod+Enter')).toBe(true);
      expect(matchesShortcut(metaEnter, 'Mod+Enter')).toBe(false);
      expect(matchesShortcut(plainEnter, 'Mod+Enter')).toBe(false);

      // 2. Mac platform
      Object.defineProperty(globalThis.navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Macintosh',
        configurable: true,
      });
      expect(matchesShortcut(metaEnter, 'Mod+Enter')).toBe(true);
      expect(matchesShortcut(ctrlEnter, 'Mod+Enter')).toBe(false);

      // Restore
      if (originalPlatform) {
        Object.defineProperty(globalThis.navigator, 'platform', originalPlatform);
      }
      if (originalUserAgent) {
        Object.defineProperty(globalThis.navigator, 'userAgent', originalUserAgent);
      }
    });

    it('prevents false positive matches when unexpected modifiers are held', () => {
      const ctrlV = createKeyboardEvent('v', { ctrlKey: true });
      // Shortcut 'v' without modifiers should not trigger on Ctrl+v (paste)
      expect(matchesShortcut(ctrlV, 'v')).toBe(false);

      const altEnter = createKeyboardEvent('Enter', { altKey: true });
      // Shortcut 'Enter' without Alt should not trigger on Alt+Enter
      expect(matchesShortcut(altEnter, 'Enter')).toBe(false);
    });
  });

  describe('Shortcut Definitions Catalog', () => {
    it('has non-empty studio, records, and forms categories', () => {
      expect(STUDIO_SHORTCUTS.length).toBeGreaterThan(0);
      expect(RECORDS_SHORTCUTS.length).toBeGreaterThan(0);
      expect(FORMS_SHORTCUTS.length).toBeGreaterThan(0);
    });

    it('every shortcut has key, label, description, and category', () => {
      const allShortcuts = [...STUDIO_SHORTCUTS, ...RECORDS_SHORTCUTS, ...FORMS_SHORTCUTS];
      for (const sc of allShortcuts) {
        expect(sc.key).toBeTruthy();
        expect(sc.label).toBeTruthy();
        expect(sc.description).toBeTruthy();
        expect(sc.category).toBeTruthy();
      }
    });
  });
});
