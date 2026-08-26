'use client';

import type * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`max-w-lg bg-card border-border shadow-2xl rounded-2xl p-6 ${className ?? ''}`}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="mt-4">{children}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={`bg-card border-t border-border rounded-t-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto ${className ?? ''}`}
      >
        <div className="mx-auto w-12 h-1.5 bg-muted-foreground/25 rounded-full mb-3.5 shrink-0" />
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-lg font-bold text-foreground">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs text-muted-foreground mt-1">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div>{children}</div>
      </SheetContent>
    </Sheet>
  );
}
