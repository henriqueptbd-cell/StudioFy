import React from 'react';

interface BookingStepsProps {
  steps: string[];
  activeIndex: number;
  tenantColor?: string | null;
}

export const BookingSteps: React.FC<BookingStepsProps> = ({ steps, activeIndex, tenantColor }) => {
  const fill = tenantColor || 'var(--primary-color)';
  return (
    <div className="mb-5">
      <ol className="flex items-center gap-1">
        {steps.map((label, i) => {
          const done = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <li key={label} className="flex flex-1 items-center gap-1 last:flex-none">
              <span
                className="flex items-center gap-1.5 text-[11px] font-semibold"
                style={{ color: isActive ? fill : done ? fill : undefined }}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{
                    backgroundColor: done || isActive ? fill : '#d4d4d8',
                  }}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="hidden whitespace-nowrap sm:inline">{label}</span>
              </span>
              {i < steps.length - 1 && (
                <span
                  className="mx-1 h-px flex-1"
                  style={{
                    backgroundColor: i < activeIndex ? fill : '#e4e4e7',
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
