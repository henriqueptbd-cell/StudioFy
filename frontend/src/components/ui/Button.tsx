import React from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

function variantClass(variant: Variant): string {
    switch (variant) {
        case 'primary':
            return 'bg-tenant-primary text-white shadow-sm hover:opacity-90 disabled:hover:opacity-40';
        case 'secondary':
            return 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 disabled:hover:bg-zinc-100';
        case 'outline':
            return 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:hover:bg-white';
        case 'ghost':
            return 'bg-transparent text-zinc-600 hover:bg-zinc-100 disabled:hover:bg-transparent';
        case 'danger':
            return 'bg-rose-600 text-white hover:bg-rose-500 disabled:hover:bg-rose-600';
    }
}

function sizeClass(size: Size): string {
    switch (size) {
        case 'sm':
            return 'h-9 px-3 text-xs';
        case 'md':
            return 'h-11 px-4 text-sm';
        case 'lg':
            return 'h-12 px-5 text-sm';
    }
}

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { className, variant = 'primary', size = 'md', fullWidth, children, ...props },
        ref
    ) => (
        <button
            ref={ref}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40',
                variantClass(variant),
                sizeClass(size),
                fullWidth && 'w-full',
                className
            )}
            {...props}
        >
            {children}
        </button>
    )
);

Button.displayName = 'Button';
