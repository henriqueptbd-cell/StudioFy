import React from 'react';
import { AppointmentStatus } from '@/types';

const STATUS_STYLES: Record<AppointmentStatus, string> = {
    PENDENTE: 'bg-amber-50 text-amber-700 ring-amber-200',
    CONFIRMADO: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    RECUSADO: 'bg-rose-50 text-rose-700 ring-rose-200',
    CONCLUIDO: 'bg-sky-50 text-sky-700 ring-sky-200',
    CANCELADO: 'bg-zinc-100 text-zinc-500 ring-zinc-200',
};

export const StatusBadge: React.FC<{ status: AppointmentStatus }> = ({ status }) => {
    const style = STATUS_STYLES[status] ?? STATUS_STYLES.CANCELADO;
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style}`}
        >
            {status}
        </span>
    );
};
