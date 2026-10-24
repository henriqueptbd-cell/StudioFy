import React from 'react';
import { cn } from '@/utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, ...props }, ref) => (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-xs font-semibold text-zinc-600">{label}</span>}
      <select
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400',
          error && 'border-rose-300 focus:border-rose-400',
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  ),
);

Select.displayName = 'Select';
