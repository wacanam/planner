import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, 'aria-invalid': ariaInvalid, ...props }, ref) => {
  const hasError = ariaInvalid === true || ariaInvalid === 'true';
  return (
    <textarea
      aria-invalid={ariaInvalid}
      className={cn(
        'flex min-h-[80px] w-full rounded-md bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
        hasError
          ? 'border border-destructive focus-visible:ring-destructive'
          : 'border border-input focus-visible:ring-ring',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
