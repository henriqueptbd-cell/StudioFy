import React from 'react';
import { Clock3 } from 'lucide-react';
import type { Service } from '@/types';
import { cn } from '@/utils/cn';

interface ServiceCardProps {
    service: Service;
    selected: boolean;
    onSelect: () => void;
    tenantColor?: string | null;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
    service,
    selected,
    onSelect,
    tenantColor,
}) => {
    const ringColor = tenantColor
        ? { '--tw-ring-color': tenantColor } as React.CSSProperties
        : undefined;
    const accentBg = { backgroundColor: tenantColor || 'var(--primary-color, #15803d)' };

    return (
        <button
            type="button"
            onClick={onSelect}
            style={selected ? ringColor : undefined}
            className={cn(
                'w-full rounded-2xl border p-4 text-left transition',
                selected
                    ? 'border-transparent bg-white shadow-md ring-2'
                    : 'border-zinc-200 bg-white/80 hover:border-zinc-300'
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-semibold text-zinc-900">{service.name}</h3>
                    {service.description && (
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                            {service.description}
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" />
                            {service.durationMinutes} min
                        </span>
                        <span className="font-semibold text-zinc-700">
                            R${' '}
                            {Number(service.price).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                </div>
                <span
                    className={cn(
                        'shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition',
                        selected ? 'text-white' : 'bg-zinc-100 text-zinc-600'
                    )}
                    style={selected ? accentBg : undefined}
                >
                    {selected ? 'Sel.' : 'Sel.'}
                </span>
            </div>
        </button>
    );
};
