import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, CalendarCheck2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { listAdminAppointments, updateAppointmentStatus } from '@/services/appointments';
import { AppointmentStatus, AdminAppointment } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

const STATUS_FILTERS: Array<{ value: AppointmentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'CONFIRMADO', label: 'Confirmados' },
  { value: 'CONCLUIDO', label: 'Concluídos' },
  { value: 'CANCELADO', label: 'Cancelados' },
];

type AllowedAction = 'CONFIRMADO' | 'RECUSADO' | 'CONCLUIDO' | 'CANCELADO';

const TRANSITIONS: Partial<Record<AppointmentStatus, AllowedAction[]>> = {
  PENDENTE: ['CONFIRMADO', 'RECUSADO', 'CANCELADO'],
  CONFIRMADO: ['CONCLUIDO', 'CANCELADO'],
};

export const AppointmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AppointmentStatus | 'ALL'>('ALL');

  const {
    data: appointments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-appointments', filter],
    queryFn: () => listAdminAppointments(filter === 'ALL' ? {} : { status: filter }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      updateAppointmentStatus(id, status),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin-appointments'],
      });
      toast.success(`Agendamento ${vars.status.toLowerCase()}.`);
    },
    onError: () => toast.error('Não foi possível atualizar o agendamento.'),
  });

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Agenda</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Agendamentos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Acompanhe as solicitações e gerencie o status de cada horário.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.value
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-zinc-400">Carregando agendamentos...</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-500">Falha ao carregar a agenda.</p>
      ) : appointments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              actions={TRANSITIONS[a.status] ?? []}
              onAction={(status) => mutation.mutate({ id: a.id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AppointmentCard: React.FC<{
  appointment: AdminAppointment;
  actions: AllowedAction[];
  onAction: (status: AppointmentStatus) => void;
}> = ({ appointment, actions, onAction }) => {
  const start = new Date(appointment.startTime);
  const date = start.toLocaleDateString('pt-BR');
  const time = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            {appointment.customer.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-zinc-900">{appointment.customer.name}</p>
            <p className="text-xs text-zinc-400">
              {date} às {time}
            </p>
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-zinc-50 px-3 py-2 text-xs">
        <span className="font-medium text-zinc-700">{appointment.service.name}</span>
        <span className="text-zinc-400">{appointment.service.durationMinutes} min</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <a
          href={appointment.whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline"
        >
          <MessageCircle className="size-3.5" /> WhatsApp
        </a>

        <div className="flex flex-wrap gap-2">
          {actions.length === 0 ? (
            <span className="text-[11px] text-zinc-400">Sem ações disponíveis</span>
          ) : (
            actions.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === 'CONFIRMADO' || action === 'CONCLUIDO' ? 'primary' : 'outline'}
                onClick={() => onAction(action)}
                className={
                  action === 'RECUSADO' || action === 'CANCELADO'
                    ? 'text-rose-600 hover:bg-rose-50'
                    : ''
                }
              >
                {action === 'CONFIRMADO' && <Check className="size-3.5" />}
                {action === 'RECUSADO' && <X className="size-3.5" />}
                {action === 'CONCLUIDO' && <Check className="size-3.5" />}
                {action === 'CANCELADO' && <X className="size-3.5" />}
                {capitalizeStatus(action)}
              </Button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

function capitalizeStatus(status: string): string {
  const map: Record<string, string> = {
    CONFIRMADO: 'Confirmar',
    RECUSADO: 'Recusar',
    CONCLUIDO: 'Concluir',
    CANCELADO: 'Cancelar',
  };
  return map[status] ?? status;
}

const EmptyState: React.FC = () => (
  <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center">
    <CalendarCheck2 className="mx-auto size-9 text-zinc-300" />
    <p className="mt-3 text-sm font-semibold text-zinc-700">Nenhum agendamento aqui</p>
    <p className="mt-1 text-xs text-zinc-400">
      Ajuste o filtro ou aguarde novas solicitações dos clientes.
    </p>
  </div>
);
