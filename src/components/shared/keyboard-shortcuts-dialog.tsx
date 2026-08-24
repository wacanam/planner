'use client';

import { FileText, Keyboard, Map as MapIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import {
  FORMS_SHORTCUTS,
  RECORDS_SHORTCUTS,
  type ShortcutDefinition,
  STUDIO_SHORTCUTS,
} from '@/lib/keyboard-shortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'all' | 'studio' | 'records' | 'forms';
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  defaultTab = 'all',
}: KeyboardShortcutsDialogProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'studio' | 'records' | 'forms'>(defaultTab);

  const tabs = [
    { id: 'all', label: 'All Shortcuts', icon: Keyboard },
    { id: 'studio', label: 'Studio & Annotations', icon: MapIcon },
    { id: 'records', label: 'Records & Scoping', icon: FileText },
    { id: 'forms', label: 'Forms & Modals', icon: Sparkles },
  ] as const;

  const renderShortcutList = (title: string, list: ShortcutDefinition[], icon: React.ReactNode) => {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/60 pb-1.5">
          {icon}
          <span>{title}</span>
          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
            {list.length}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {list.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-card border border-border/80 hover:border-primary/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{item.label}</div>
                <div className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                  {item.description}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k, idx) => (
                  <kbd
                    key={`${item.id}-${k}-${idx}`}
                    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md bg-muted border border-border/80 font-mono text-[10px] font-bold text-foreground shadow-2xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard Shortcuts"
      description="Power shortcuts for rapid map annotation drafting and records management"
      className="max-w-2xl"
    >
      <div className="space-y-4 pt-1 max-h-[68vh] overflow-y-auto pr-0.5 no-scrollbar">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-card text-foreground shadow-2xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Shortcut Lists */}
        {(activeTab === 'all' || activeTab === 'studio') &&
          renderShortcutList(
            'Territory Studio & Map Annotations',
            STUDIO_SHORTCUTS,
            <MapIcon size={14} className="text-primary" />
          )}

        {(activeTab === 'all' || activeTab === 'records') &&
          renderShortcutList(
            'Records, Directory & Scopes',
            RECORDS_SHORTCUTS,
            <FileText size={14} className="text-primary" />
          )}

        {(activeTab === 'all' || activeTab === 'forms') &&
          renderShortcutList(
            'Forms, Dialogs & Actions',
            FORMS_SHORTCUTS,
            <Sparkles size={14} className="text-primary" />
          )}

        <div className="pt-2 text-center text-[11px] text-muted-foreground border-t border-border/40">
          Press{' '}
          <kbd className="font-mono font-bold bg-muted px-1 py-0.5 rounded text-[10px]">?</kbd>{' '}
          anywhere to open this shortcuts reference.
        </div>
      </div>
    </ResponsiveDialog>
  );
}
