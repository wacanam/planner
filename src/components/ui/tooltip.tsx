'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(
  (
    {
      className,
      sideOffset = 4,
      collisionPadding = 12,
      avoidCollisions = true,
      sticky = 'always',
      ...props
    },
    ref
  ) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      avoidCollisions={avoidCollisions}
      sticky={sticky}
      className={cn(
        'z-50 max-h-[var(--radix-tooltip-content-available-height,calc(100dvh-2rem))] max-w-[calc(100dvw-1.5rem)] overflow-hidden rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    />
  )
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
