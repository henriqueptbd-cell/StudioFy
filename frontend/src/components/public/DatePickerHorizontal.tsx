import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';
import { addDays, todayISO } from '@/utils/format';

interface DatePickerHorizontalProps {
    selectedDate: string;
    onSelect: (date: string) => void;
    /** Cor do tenant para destacar dia selecionado. */
    tenantColor?: string | null;
}

const WEEKDAYS_FULL = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
];

export const DatePickerHorizontal: React.FC<DatePickerHorizontalProps> = ({
    selectedDate,
    onSelect,
    tenantColor,
}) => {
    const days = useMemo(() => {
        const ref = new Date();
        return Array.from({ length: 8 }, (_, i) => {
            const d = addDays(ref, i);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                d.getDate()
            ).padStart(2, '0')}`;
            const base = new Date(iso + 'T12:00:00');
            const weekday = WEEKDAYS_FULL[base.getDay()];
            const dayNum = d.getDate();
            const isToday = iso === todayISO();
            const label = isToday
                ? 'Hoje'
                : i === 1
                  ? 'Amanhã'
                  : weekday.slice(0, 3);
            return { iso, dayNum, weekday, label, isToday };
        });
    }, []);

    return (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
            {days.map((d) => {
                const isSelected = selectedDate === d.iso;
                return (
                    <button
                        key={d.iso}
                        type="button"
                        onClick={() => onSelect(d.iso)}
                        className={cn(
                            'flex min-w-[64px] flex-col items-center rounded-2xl border p-3 text-center transition',
                            isSelected
                                ? 'text-white'
                                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                        )}
                        style={
                            isSelected && tenantColor
                                ? { backgroundColor: tenantColor, borderColor: tenantColor }
                                : isSelected
                                  ? {
                                        backgroundColor: 'var(--primary-color)',
                                        borderColor: 'var(--primary-color)',
                                    }
                                  : undefined
                        }
                    >
                        <span className="text-[10px] font-semibold uppercase">
                            {d.label}
                        </span>
                        <strong className="mt-1 block text-lg leading-none">
                            {d.dayNum}
                        </strong>
                    </button>
                );
            })}
        </div>
    );
};
