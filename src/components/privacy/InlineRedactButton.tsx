// src/components/privacy/InlineRedactButton.tsx
'use client';

import { Eraser, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { canRedactPrivacyFields } from '@/lib/permissions';
import {
  cleanStreetOrAddress,
  detectSpiAndPiiViolations,
  sanitizeOpenText,
} from '@/lib/privacy/open-text-guard';

export interface InlineRedactButtonProps {
  value?: string | null;
  fieldType?: 'notes' | 'address' | 'text';
  user?: { role?: string | null; congregationRole?: string | null } | null;
  onRedact: (newValue: string | null) => Promise<void> | void;
  className?: string;
}

export function InlineRedactButton({
  value,
  fieldType = 'notes',
  user: userProp,
  onRedact,
  className = '',
}: InlineRedactButtonProps) {
  const { user: authUser } = useCurrentUser();
  const effectiveUser = userProp ?? authUser;
  const [loading, setLoading] = useState(false);

  const canRedact = canRedactPrivacyFields(effectiveUser?.role, effectiveUser?.congregationRole);

  const currentText = (value || '').trim();
  if (!canRedact || !currentText || currentText === '[REDACTED]') {
    return null;
  }

  const violations = detectSpiAndPiiViolations(currentText);
  const hasViolations = violations.length > 0;

  const handleRedact = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;

    // Blur button before disabling/unmounting to prevent browser from reverting focus to document.body and jumping scroll
    (e.currentTarget as HTMLElement)?.blur();

    setLoading(true);
    try {
      let finalValue: string | null = null;

      if (fieldType === 'address') {
        const cleaned = cleanStreetOrAddress(currentText);
        if (cleaned && cleaned !== currentText) {
          finalValue = cleaned;
        } else {
          finalValue = '[REDACTED]';
        }
      } else {
        // Notes or general text
        const sanitized = sanitizeOpenText(currentText);
        if (sanitized && sanitized !== currentText) {
          finalValue = sanitized;
        } else if (!sanitized) {
          finalValue = null;
        } else {
          finalValue = '[REDACTED]';
        }
      }

      await onRedact(finalValue);
      toast.success(finalValue ? 'Field sanitized for data privacy.' : 'Sensitive note removed.');
    } catch (err) {
      console.error('Failed to redact value:', err);
      toast.error('Could not redact field. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRedact}
      disabled={loading}
      title={
        hasViolations
          ? `Privacy warning (${violations.join(', ')}). Click to one-click redact.`
          : 'One-click redact for data privacy'
      }
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer shrink-0 select-none ${
        hasViolations
          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
          : 'bg-muted/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/40'
      } ${className}`}
    >
      {loading ? (
        <Loader2 size={11} className="animate-spin" />
      ) : hasViolations ? (
        <ShieldAlert size={11} className="text-amber-600 dark:text-amber-400" />
      ) : (
        <Eraser size={11} />
      )}
      <span>{hasViolations ? 'Redact PII' : 'Redact'}</span>
    </button>
  );
}
