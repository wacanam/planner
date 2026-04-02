'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { Input, type InputProps } from './input';
import { Textarea } from './textarea';

// ─── FormField ────────────────────────────────────────────────────────────────
// Reusable wrapper: Label + Input/Textarea + inline error message.
// Pass `error` and it automatically marks the field red.
//
// Usage:
//   <FormField
//     label="Email"
//     id="email"
//     type="email"
//     error={errors.email?.message}
//     {...register('email')}
//   />
//   <FormField
//     label="Notes"
//     id="notes"
//     multiline
//     rows={3}
//     error={errors.notes?.message}
//     {...register('notes')}
//   />

interface FormFieldBaseProps {
  label?: string;
  id?: string;
  error?: string;
  hint?: string;                    // optional helper text shown when no error
  required?: boolean;
  optional?: boolean;               // shows "(optional)" label
  containerClassName?: string;
  labelClassName?: string;
}

interface FormFieldInputProps
  extends FormFieldBaseProps,
    Omit<InputProps, 'id'> {
  multiline?: false;
}

interface FormFieldTextareaProps
  extends FormFieldBaseProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  multiline: true;
  rows?: number;
}

export type FormFieldProps = FormFieldInputProps | FormFieldTextareaProps;

export const FormField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  FormFieldProps
>(({ label, id, error, hint, required, optional, containerClassName, labelClassName, multiline, ...rest }, ref) => {
  const hasError = !!error;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <Label htmlFor={id} className={labelClassName}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && (
            <span className="text-muted-foreground text-xs ml-1">(optional)</span>
          )}
        </Label>
      )}

      {multiline ? (
        <Textarea
          id={id}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : hint ? `${id}-hint` : undefined}
          ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <Input
          id={id}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : hint ? `${id}-hint` : undefined}
          ref={ref as React.ForwardedRef<HTMLInputElement>}
          {...(rest as InputProps)}
        />
      )}

      {hasError && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {!hasError && hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';
