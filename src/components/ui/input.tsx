import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const hasError = ariaInvalid === true || ariaInvalid === 'true';
    return (
      <input
        type={type}
        aria-invalid={ariaInvalid}
        className={cn(
          'flex h-10 w-full rounded-xl border bg-background px-4 py-2 text-sm text-foreground shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
          hasError
            ? 'border-destructive focus-visible:ring-destructive focus-visible:border-destructive'
            : 'border-input focus-visible:ring-primary focus-visible:border-transparent',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
