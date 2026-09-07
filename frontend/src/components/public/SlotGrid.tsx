import React from 'react';
import { cn } from '@/utils/cn';

interface SlotGridProps {
  slots: string[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  loading?: boolean;
  tenantColor?: string | null;
}

export const SlotGrid: React.FC<SlotGridProps> = ({
  slots,
  selectedTime,
  onSelect,
  loading,
  tenantColor,
}) => {
  if (loading) {
    return <p className="col-span-3 text-xs text-zinc-400">Verificando horários livres...</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="col-span-3 py-4 text-center text-xs text-zinc-400">
        Nenhum horário disponível para esta data.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((time) => {
        const isSelected = selectedTime === time;
        return (
          <button
            key={time}
            type="button"
            onClick={() => onSelect(time)}
            className={cn(
              'rounded-xl border py-3 text-sm font-semibold transition',
              isSelected
                ? 'text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300',
            )}
            style={
              isSelected && tenantColor
                ? {
                    backgroundColor: tenantColor,
                    borderColor: tenantColor,
                  }
                : isSelected
                  ? {
                      backgroundColor: 'var(--primary-color)',
                      borderColor: 'var(--primary-color)',
                    }
                  : undefined
            }
          >
            {time}
          </button>
        );
      })}
    </div>
  );
};
