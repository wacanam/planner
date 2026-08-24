'use client';

import { useEffect, useRef } from 'react';
import { isInputElement, matchesShortcut, type ShortcutBinding } from '@/lib/keyboard-shortcuts';

export function useKeyboardShortcuts(
  shortcuts: ShortcutBinding[],
  options?: {
    disabled?: boolean;
    targetRef?: React.RefObject<HTMLElement | null>;
  }
) {
  const shortcutsRef = useRef<ShortcutBinding[]>(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (options?.disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isInput = isInputElement(event.target);

      for (const binding of shortcutsRef.current) {
        if (binding.disabled) continue;

        // By default, do not trigger single character shortcuts while user is typing in form fields
        if (isInput && !binding.enableInInputs) {
          continue;
        }

        const keys = Array.isArray(binding.key) ? binding.key : [binding.key];
        const isMatch = keys.some((k) => matchesShortcut(event, k));

        if (isMatch) {
          if (binding.preventDefault !== false) {
            event.preventDefault();
          }
          if (binding.stopPropagation) {
            event.stopPropagation();
          }
          binding.handler(event);
          break;
        }
      }
    };

    const target = options?.targetRef?.current || window;
    target.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [options?.disabled, options?.targetRef]);
}
