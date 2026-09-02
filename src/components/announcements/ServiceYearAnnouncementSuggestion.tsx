'use client';

import {
  Calendar,
  ChevronRight,
  Flame,
  Lightbulb,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { playHapticFeedback } from '@/lib/sound';
import type { ServiceYearSuggestion } from '@/types/api';

export interface ServiceYearAnnouncementSuggestionProps {
  suggestion: ServiceYearSuggestion;
  onUseSuggestion: (suggestion: ServiceYearSuggestion) => void;
  onDismiss?: () => void;
}

export function ServiceYearAnnouncementSuggestion({
  suggestion,
  onUseSuggestion,
  onDismiss,
}: ServiceYearAnnouncementSuggestionProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    playHapticFeedback('light');
    setDismissed(true);
    onDismiss?.();
  };

  const handleUse = () => {
    playHapticFeedback('medium');
    onUseSuggestion(suggestion);
  };

  const getMilestoneIcon = () => {
    switch (suggestion.milestone) {
      case 'kickoff':
        return <Sparkles className="h-5 w-5 text-primary" />;
      case 'campaign':
        return <Flame className="h-5 w-5 text-orange-500" />;
      case 'closing':
        return <Calendar className="h-5 w-5 text-destructive" />;
      default:
        return <Lightbulb className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <Card className="mb-4 border-primary/40 bg-primary/5 p-4 relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 shrink-0">
            {getMilestoneIcon()}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">{suggestion.title}</h4>
              <Badge variant="default" className="text-[11px] font-semibold">
                {suggestion.badgeLabel}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Periodic Service Year Recommendation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Dismiss suggestion"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2.5 text-xs text-foreground/90 leading-relaxed">
        {suggestion.reason}
      </p>

      {/* Suggested Draft Preview Box */}
      <div className="mt-3 rounded-lg border border-border/70 bg-card p-3 shadow-xs">
        <div className="text-xs font-bold text-primary truncate">
          Draft: {suggestion.suggestedTitle}
        </div>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {suggestion.suggestedContent}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs h-8">
          Dismiss
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleUse}
          className="gap-1 text-xs font-semibold h-8"
        >
          Use Template & Post
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
