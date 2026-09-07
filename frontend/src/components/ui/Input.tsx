import React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    innerClassName?: string;
    leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, innerClassName, leftIcon, ...props }, ref) => (
        <label className={cn('block', className)}>
            {label && (
                <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
                    {label}
                </span>
            )}
            <div
                className={cn(
                    'flex items-center rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-400',
                    error && 'border-rose-300 focus-within:border-rose-400'
                )}
            >
                {leftIcon && <span className="pl-3 text-zinc-400">{leftIcon}</span>}
                <input
                    ref={ref}
                    className={cn(
                        'h-11 w-full bg-transparent px-3 text-sm outline-none placeholder:text-zinc-400',
                        leftIcon && 'pl-1',
                        innerClassName
                    )}
                    {...props}
                />
            </div>
            {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
        </label>
    )
);

Input.displayName = 'Input';
