export type ShortcutCategory = 'studio' | 'records' | 'forms' | 'navigation' | 'global';

export interface ShortcutDefinition {
  id: string;
  key: string;
  label: string;
  description: string;
  category: ShortcutCategory;
  keys: string[]; // e.g. ['Ctrl', 'Z'] or ['1'] or ['V']
}

/**
 * Checks whether the focused element is a text entry field
 * (input, textarea, select, contenteditable) where single-letter shortcuts should be ignored.
 */
export function isInputElement(target: EventTarget | null | undefined): boolean {
  if (!target) {
    return false;
  }

  const el = target as {
    tagName?: string;
    type?: string;
    isContentEditable?: boolean;
    getAttribute?: (attr: string) => string | null;
  };

  const tagName = el.tagName?.toLowerCase();
  if (!tagName) {
    return false;
  }

  if (tagName === 'input') {
    const type = el.type?.toLowerCase();
    // Non-text inputs where shortcuts could be allowed or ignored safely
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(
      type || ''
    );
  }

  if (tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  if (
    el.isContentEditable ||
    (typeof el.getAttribute === 'function' && el.getAttribute('role') === 'textbox')
  ) {
    return true;
  }

  return false;
}

export interface ShortcutBinding {
  key: string | string[]; // e.g. '1', ['v', 'V'], 'Enter', 'Escape', 'Ctrl+z', 'Mod+s'
  handler: (e: KeyboardEvent) => void;
  description?: string;
  enableInInputs?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disabled?: boolean;
}

/**
 * Normalizes a key identifier to match standard KeyboardEvent properties.
 * 'Mod' or 'mod' will dynamically resolve to Meta on Mac and Ctrl on Windows/Linux.
 */
export function matchesShortcut(event: KeyboardEvent, keyCombo: string): boolean {
  const isMac =
    typeof navigator !== 'undefined' &&
    (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent));

  const parts = keyCombo
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);

  let requireCtrl = false;
  let requireMeta = false;
  let requireAlt = false;
  let requireShift = false;
  let expectedKey = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'mod') {
      if (isMac) requireMeta = true;
      else requireCtrl = true;
    } else if (lower === 'cmd' || lower === 'meta') {
      requireMeta = true;
    } else if (lower === 'ctrl' || lower === 'control') {
      requireCtrl = true;
    } else if (lower === 'alt' || lower === 'option') {
      requireAlt = true;
    } else if (lower === 'shift') {
      requireShift = true;
    } else {
      expectedKey = part;
    }
  }

  // Check modifier requirements
  const ctrlOrMetaMatch =
    (requireCtrl ? event.ctrlKey : true) &&
    (requireMeta ? event.metaKey : true) &&
    // If neither ctrl nor meta is required, ensure neither is held (unless it's Alt or Shift)
    (!requireCtrl && !requireMeta ? !event.ctrlKey && !event.metaKey : true);

  if (!ctrlOrMetaMatch) return false;
  if (requireAlt !== event.altKey) return false;
  if (requireShift !== event.shiftKey && expectedKey !== '?' && expectedKey !== '+') {
    return false;
  }

  // Match the primary key (case-insensitive for letters)
  const eventKey = event.key;
  if (!expectedKey) return true;

  if (expectedKey.length === 1 && eventKey.length === 1) {
    return expectedKey.toLowerCase() === eventKey.toLowerCase();
  }

  // Special key aliases
  const aliasMap: Record<string, string[]> = {
    esc: ['Escape', 'Esc'],
    escape: ['Escape'],
    enter: ['Enter', 'Return'],
    return: ['Enter', 'Return'],
    space: [' ', 'Space', 'Spacebar'],
    backspace: ['Backspace'],
    delete: ['Delete', 'Del'],
    del: ['Delete', 'Del'],
    tab: ['Tab'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    arrowup: ['ArrowUp'],
    arrowdown: ['ArrowDown'],
    arrowleft: ['ArrowLeft'],
    arrowright: ['ArrowRight'],
    slash: ['/'],
    plus: ['+', '='],
    minus: ['-', '_'],
  };

  const aliases = aliasMap[expectedKey.toLowerCase()];
  if (aliases) {
    return aliases.includes(eventKey);
  }

  return expectedKey.toLowerCase() === eventKey.toLowerCase();
}

export const STUDIO_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'tool-pointer',
    key: '1 / V',
    label: 'Select / Pointer Tool',
    description: 'Inspect, select, drag households, and manage annotations',
    category: 'studio',
    keys: ['1', 'V'],
  },
  {
    id: 'tool-boundary',
    key: '2 / B',
    label: 'Boundary Tool',
    description: 'Draw territory boundary perimeter or zone polygon',
    category: 'studio',
    keys: ['2', 'B'],
  },
  {
    id: 'tool-road',
    key: '3 / R',
    label: 'Road & Corridor Tool',
    description: 'Trace street paths and road alignments',
    category: 'studio',
    keys: ['3', 'R'],
  },
  {
    id: 'tool-pin',
    key: '4 / H',
    label: 'Household Pin Tool',
    description: 'Place new household pins on map',
    category: 'studio',
    keys: ['4', 'H'],
  },
  {
    id: 'tool-landmark',
    key: '5 / L',
    label: 'Landmark Tool',
    description: 'Drop landmarks, stores, schools, or meeting flags',
    category: 'studio',
    keys: ['5', 'L'],
  },
  {
    id: 'tool-start',
    key: '6 / S',
    label: 'Start Meeting Flag Tool',
    description: 'Set group meeting location start point',
    category: 'studio',
    keys: ['6', 'S'],
  },
  {
    id: 'drawing-undo',
    key: 'Mod+Z',
    label: 'Undo Point',
    description: 'Remove last drawn vertex while drafting boundary or road',
    category: 'studio',
    keys: ['Ctrl/⌘', 'Z'],
  },
  {
    id: 'drawing-finish',
    key: 'Enter',
    label: 'Complete Drawing',
    description: 'Finish drawing boundary polygon or save road route',
    category: 'studio',
    keys: ['Enter'],
  },
  {
    id: 'drawing-cancel',
    key: 'Escape',
    label: 'Cancel / Deselect',
    description: 'Exit active drawing tool or deselect highlighted annotation',
    category: 'studio',
    keys: ['Esc'],
  },
  {
    id: 'item-edit',
    key: 'E',
    label: 'Edit Selected Item',
    description: 'Open edit modal for selected road, landmark, boundary, or house',
    category: 'studio',
    keys: ['E'],
  },
  {
    id: 'item-delete',
    key: 'Delete / Backspace',
    label: 'Delete Vertex / Annotation',
    description: 'Remove selected vertex or delete selected annotation item',
    category: 'studio',
    keys: ['Del'],
  },
  {
    id: 'basemap-cycle',
    key: 'M',
    label: 'Cycle Basemap Mode',
    description: 'Toggle between standard, satellite, terrain, dark, and minimal basemaps',
    category: 'studio',
    keys: ['M'],
  },
  {
    id: 'map-zoom-in',
    key: '+ / =',
    label: 'Zoom In',
    description: 'Increase map zoom level',
    category: 'studio',
    keys: ['+'],
  },
  {
    id: 'map-zoom-out',
    key: '-',
    label: 'Zoom Out',
    description: 'Decrease map zoom level',
    category: 'studio',
    keys: ['-'],
  },
  {
    id: 'map-fit',
    key: '0 / F',
    label: 'Fit Bounds / Reset View',
    description: 'Frame camera view to fit territory boundaries',
    category: 'studio',
    keys: ['F'],
  },
  {
    id: 'toggle-sidebar',
    key: '[',
    label: 'Toggle Workspace Sidebar',
    description: 'Open or close Studio side drawer menu',
    category: 'studio',
    keys: ['['],
  },
  {
    id: 'print-viewport',
    key: 'P / Alt+P',
    label: 'Print Viewport Mode',
    description: 'Toggle territory card framing and print export viewport',
    category: 'studio',
    keys: ['P'],
  },
  {
    id: 'search-location',
    key: '/ or Mod+K',
    label: 'Search Map Location',
    description: 'Focus map search bar to find addresses or landmarks',
    category: 'studio',
    keys: ['/'],
  },
];

export const RECORDS_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'records-tab-households',
    key: '1 or Alt+1',
    label: 'Households Directory',
    description: 'Switch to Households tab',
    category: 'records',
    keys: ['1'],
  },
  {
    id: 'records-tab-visits',
    key: '2 or Alt+2',
    label: 'Visits Directory',
    description: 'Switch to Visits log tab',
    category: 'records',
    keys: ['2'],
  },
  {
    id: 'records-tab-encounters',
    key: '3 or Alt+3',
    label: 'Encounters Directory',
    description: 'Switch to Encounters tab',
    category: 'records',
    keys: ['3'],
  },
  {
    id: 'records-tab-shared',
    key: '4 or Alt+4',
    label: 'Shared Records',
    description: 'Switch to Shared households tab',
    category: 'records',
    keys: ['4'],
  },
  {
    id: 'records-scope-mine',
    key: 'M',
    label: 'My Records Scope',
    description: 'Filter directory to personal assigned records',
    category: 'records',
    keys: ['M'],
  },
  {
    id: 'records-scope-group',
    key: 'G',
    label: 'Group Records Scope',
    description: 'Filter directory to service group records',
    category: 'records',
    keys: ['G'],
  },
  {
    id: 'records-scope-congregation',
    key: 'C',
    label: 'Congregation Records Scope',
    description: 'Filter directory to congregation-wide records',
    category: 'records',
    keys: ['C'],
  },
  {
    id: 'records-search',
    key: '/ or Mod+K',
    label: 'Search Records',
    description: 'Focus directory search bar',
    category: 'records',
    keys: ['/'],
  },
  {
    id: 'records-nav-next',
    key: 'J / ↓',
    label: 'Select Next Record',
    description: 'Move keyboard focus down to next record in list',
    category: 'records',
    keys: ['J', '↓'],
  },
  {
    id: 'records-nav-prev',
    key: 'K / ↑',
    label: 'Select Previous Record',
    description: 'Move keyboard focus up to previous record in list',
    category: 'records',
    keys: ['K', '↑'],
  },
  {
    id: 'records-open-detail',
    key: 'Enter',
    label: 'Open Record Details',
    description: 'View full history and contacts for focused record',
    category: 'records',
    keys: ['Enter'],
  },
  {
    id: 'records-add-new',
    key: 'N or +',
    label: 'Add New Record',
    description: 'Open new Household, Visit, or Encounter modal',
    category: 'records',
    keys: ['N'],
  },
  {
    id: 'records-quick-visit',
    key: 'V',
    label: 'Log Visit',
    description: 'Quickly open Log Visit sheet for focused household',
    category: 'records',
    keys: ['V'],
  },
  {
    id: 'records-quick-encounter',
    key: 'E',
    label: 'Log Encounter / Edit',
    description: 'Add encounter note or edit focused visit/household',
    category: 'records',
    keys: ['E'],
  },
  {
    id: 'records-share',
    key: 'S',
    label: 'Share Household',
    description: 'Open Share Household dialog for focused record',
    category: 'records',
    keys: ['S'],
  },
  {
    id: 'records-delete',
    key: 'Delete / Backspace',
    label: 'Delete Record',
    description: 'Prompt confirmation to delete focused record',
    category: 'records',
    keys: ['Del'],
  },
  {
    id: 'records-escape',
    key: 'Escape',
    label: 'Clear / Deselect',
    description: 'Clear search filter, close modals, or deselect active item',
    category: 'records',
    keys: ['Esc'],
  },
];

export const FORMS_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'form-submit',
    key: 'Mod+Enter',
    label: 'Submit & Save',
    description: 'Save household, visit, encounter, or annotation changes',
    category: 'forms',
    keys: ['Ctrl/⌘', 'Enter'],
  },
  {
    id: 'form-cancel',
    key: 'Escape',
    label: 'Cancel & Close',
    description: 'Dismiss modal, sheet, or action card without saving',
    category: 'forms',
    keys: ['Esc'],
  },
];
