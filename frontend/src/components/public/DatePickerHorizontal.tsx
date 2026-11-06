import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { addDaysToISODate } from '@/utils/format';
import { todayInTimeZone } from '@/utils/timezone';

interface DatePickerHorizontalProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  /** Cor do tenant para destacar dia selecionado. */
  tenantColor?: string | null;
  /** Fuso IANA usado para definir "hoje". */
  timezone: string;
  /** Último dia público, inclusive, no formato YYYY-MM-DD. */
  publicBookingUntil: string;
}

const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const PAGE_SIZE = 8;

export const DatePickerHorizontal: React.FC<DatePickerHorizontalProps> = ({
  selectedDate,
  onSelect,
  tenantColor,
  timezone,
  publicBookingUntil,
}) => {
  const today = todayInTimeZone(timezone);
  const [pageStart, setPageStart] = useState(today);
  const windowIsOpen = publicBookingUntil >= today;

  useEffect(() => {
    if (
      !windowIsOpen ||
      !selectedDate ||
      selectedDate < today ||
      selectedDate > publicBookingUntil
    ) {
      setPageStart(today);
      return;
    }
    const selectedOffset =
      (new Date(`${selectedDate}T00:00:00.000Z`).getTime() -
        new Date(`${today}T00:00:00.000Z`).getTime()) /
      86_400_000;
    const pageOffset = Math.floor(selectedOffset / PAGE_SIZE) * PAGE_SIZE;
    setPageStart(addDaysToISODate(today, pageOffset));
  }, [publicBookingUntil, selectedDate, today, timezone, windowIsOpen]);

  const days = useMemo(() => {
    if (!windowIsOpen) return [];
    return Array.from({ length: PAGE_SIZE }, (_, i) => addDaysToISODate(pageStart, i))
      .filter((iso) => iso <= publicBookingUntil)
      .map((iso) => {
        const base = new Date(`${iso}T12:00:00Z`);
        const dayNum = Number(iso.slice(8, 10));
        const weekday = WEEKDAYS_FULL[base.getUTCDay()];
        const offset = Math.round(
          (base.getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86_400_000,
        );
        const label = offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : weekday.slice(0, 3);
        return { iso, dayNum, weekday, label, isToday: offset === 0 };
      });
  }, [pageStart, publicBookingUntil, today, windowIsOpen]);

  const canGoPrevious = pageStart > today;
  const nextPageStart = addDaysToISODate(pageStart, PAGE_SIZE);
  const canGoNext = windowIsOpen && nextPageStart <= publicBookingUntil;

  const movePage = (direction: -1 | 1) => {
    const nextStart = addDaysToISODate(pageStart, direction * PAGE_SIZE);
    setPageStart(nextStart < today ? today : nextStart);
  };

  return (
    <section aria-label="Escolha uma data para o agendamento">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => movePage(-1)}
          disabled={!canGoPrevious}
          aria-label="Mostrar 8 dias anteriores"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <p className="text-xs font-medium text-zinc-500" aria-live="polite">
          {days.length > 0
            ? `${days[0].iso.split('-').reverse().join('/')} – ${days[days.length - 1].iso.split('-').reverse().join('/')}`
            : 'Agendamento indisponível'}
        </p>
        <button
          type="button"
          onClick={() => movePage(1)}
          disabled={!canGoNext}
          aria-label="Mostrar próximos 8 dias"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>

      {days.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
          {days.map((day) => {
            const isSelected = selectedDate === day.iso;
            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => onSelect(day.iso)}
                aria-label={`${day.label}, ${day.dayNum} de ${day.weekday}`}
                aria-pressed={isSelected}
                className={cn(
                  'flex min-w-[64px] flex-col items-center rounded-2xl border p-3 text-center transition',
                  isSelected
                    ? 'text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                )}
                style={
                  isSelected
                    ? {
                        backgroundColor: tenantColor || 'var(--primary-color)',
                        borderColor: tenantColor || 'var(--primary-color)',
                      }
                    : undefined
                }
              >
                <span className="text-[10px] font-semibold uppercase">{day.label}</span>
                <strong className="mt-1 block text-lg leading-none">{day.dayNum}</strong>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-5 text-center text-sm text-zinc-500">
          Não há datas disponíveis para agendamento público no momento.
        </p>
      )}
    </section>
  );
};
