import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check, Clock3, Search, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { createAssistedAppointment, fetchAdminAvailableSlots } from '@/services/appointments';
import { fetchAdminCustomers } from '@/services/customers';
import { fetchTeamMembers } from '@/services/team';
import { fetchAdminServices } from '@/services/tenantServices';
import { fetchTenantSettings } from '@/services/tenantSettings';
import { AdminCustomer, TeamMember } from '@/types';
import { extractErrorMessage } from '@/services/api';
import { DEFAULT_TZ, todayInTimeZone, zonedToUtcIso } from '@/utils/timezone';

interface AssistedAppointmentDialogProps {
  onClose: () => void;
}

type CustomerMode = 'existing' | 'new';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function isConflictError(error: unknown): boolean {
  const candidate = error as {
    response?: { status?: number; data?: { error?: { code?: string } } };
  };
  return (
    candidate.response?.status === 409 ||
    candidate.response?.data?.error?.code?.toLowerCase().includes('conflict') === true
  );
}

export const AssistedAppointmentDialog: React.FC<AssistedAppointmentDialogProps> = ({
  onClose,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CustomerMode>('existing');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [saveError, setSaveError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const isSavingRef = useRef(false);

  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
  } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchTenantSettings,
  });
  const {
    data: serviceResults = [],
    isLoading: servicesLoading,
    error: servicesError,
  } = useQuery({
    queryKey: ['admin-services'],
    queryFn: fetchAdminServices,
  });
  const services = serviceResults.filter((service) => service.active);
  const {
    data: customers = [],
    isLoading: customersLoading,
    error: customersError,
  } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: () => fetchAdminCustomers(search.trim() || undefined),
    enabled: mode === 'existing',
  });
  const {
    data: team = [],
    isLoading: teamLoading,
    error: teamError,
  } = useQuery({
    queryKey: ['admin-team'],
    queryFn: fetchTeamMembers,
    enabled: isAdmin,
  });
  const professionals = team.filter((member) => member.active && member.role === 'PROFESSIONAL');
  const timezone = settings?.tenant.timezone || DEFAULT_TZ;
  const {
    data: slotsData,
    isLoading: slotsLoading,
    error: slotsError,
  } = useQuery({
    queryKey: ['assisted-appointment-slots', user?.tenantId, date, serviceId],
    queryFn: () => fetchAdminAvailableSlots(date, serviceId),
    enabled: Boolean(user?.tenantId && date && serviceId),
    staleTime: 30_000,
  });

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingRef.current) onClose();
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const createMutation = useMutation({
    mutationFn: createAssistedAppointment,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-customers'] }),
      ]);
      toast.success('Agendamento criado e confirmado.');
      onClose();
    },
    onError: (error: unknown) => {
      if (isConflictError(error)) {
        void queryClient.invalidateQueries({
          queryKey: ['assisted-appointment-slots', user?.tenantId, date, serviceId],
        });
      }
      setSaveError(
        isConflictError(error)
          ? 'Esse horário acabou de ser ocupado. Atualize os horários e escolha outro slot.'
          : extractErrorMessage(error) || 'Não foi possível salvar o agendamento. Tente novamente.',
      );
    },
  });
  isSavingRef.current = createMutation.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError('');
    setPhoneError('');
    if (!serviceId || !date || !selectedSlot) {
      setSaveError('Selecione um serviço, uma data e um horário disponível.');
      return;
    }
    if (mode === 'existing' && !selectedCustomer) {
      setSaveError('Selecione um cliente da lista.');
      return;
    }
    if (mode === 'new' && phoneDigits.length < 10) {
      setPhoneError('Informe um telefone com DDD válido.');
      return;
    }

    const payload = {
      serviceId,
      startTime: zonedToUtcIso(date, selectedSlot, timezone),
      ...(mode === 'existing' && selectedCustomer
        ? { customerId: selectedCustomer.id }
        : { customer: { name: customerName.trim(), phone: phoneDigits } }),
      ...(isAdmin && professionalId ? { professionalId } : {}),
    };
    createMutation.mutate(payload);
  };

  const handleModeChange = (nextMode: CustomerMode) => {
    setMode(nextMode);
    setSelectedCustomer(null);
    setSaveError('');
  };

  const changeService = (nextServiceId: string) => {
    setServiceId(nextServiceId);
    setSelectedSlot('');
  };

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    setSelectedSlot('');
  };

  const availableSlots = slotsData?.availableSlots ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !createMutation.isPending) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assisted-appointment-title"
        tabIndex={-1}
        className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Agenda</p>
            <h2 id="assisted-appointment-title" className="mt-1 text-xl font-bold text-zinc-950">
              Novo agendamento
            </h2>
            <p className="mt-1 text-sm text-zinc-500">O horário será criado já confirmado.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            aria-label="Fechar formulário"
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <X className="size-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 px-5 py-5 sm:px-7">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-zinc-800">Cliente</legend>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1">
              <button
                type="button"
                aria-pressed={mode === 'existing'}
                onClick={() => handleModeChange('existing')}
                className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${mode === 'existing' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
              >
                Buscar cliente
              </button>
              <button
                type="button"
                aria-pressed={mode === 'new'}
                onClick={() => handleModeChange('new')}
                className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${mode === 'new' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
              >
                Cadastrar cliente
              </button>
            </div>

            {mode === 'existing' ? (
              <div className="mt-3 space-y-3">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700">
                        <UserRound className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {selectedCustomer.name}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {formatPhone(selectedCustomer.phone)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="shrink-0 text-xs font-semibold text-emerald-800 underline"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      label="Buscar por nome ou telefone"
                      placeholder="Digite para pesquisar"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      leftIcon={<Search className="size-4" />}
                      autoComplete="off"
                    />
                    <div
                      className="max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-zinc-200 p-1"
                      aria-live="polite"
                    >
                      {customersLoading ? (
                        <p className="px-3 py-4 text-center text-sm text-zinc-500">
                          Buscando clientes...
                        </p>
                      ) : customersError ? (
                        <p className="px-3 py-4 text-center text-sm text-rose-600">
                          Não foi possível carregar os clientes.
                        </p>
                      ) : customers.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-zinc-500">
                          {search.trim()
                            ? 'Nenhum cliente encontrado. Você pode cadastrá-lo agora.'
                            : 'Nenhum cliente cadastrado. Cadastre um novo para continuar.'}
                        </p>
                      ) : (
                        customers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-zinc-800">
                                {customer.name}
                              </span>
                              <span className="block text-xs text-zinc-500">
                                {formatPhone(customer.phone)}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-zinc-400">Selecionar</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Nome completo"
                  placeholder="Nome do cliente"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  required
                  autoComplete="name"
                  leftIcon={<UserRound className="size-4" />}
                />
                <PhoneInput
                  value={customerPhone}
                  onChange={(masked, digits) => {
                    setCustomerPhone(masked);
                    setPhoneDigits(digits);
                    setPhoneError('');
                  }}
                  error={phoneError || undefined}
                />
              </div>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Serviço ativo
              </span>
              <select
                value={serviceId}
                onChange={(event) => changeService(event.target.value)}
                required
                disabled={servicesLoading || services.length === 0}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400 disabled:bg-zinc-50"
              >
                <option value="">
                  {servicesLoading ? 'Carregando serviços...' : 'Selecione um serviço'}
                </option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.durationMinutes} min
                  </option>
                ))}
              </select>
              {servicesError && (
                <span className="mt-1 block text-xs text-rose-600">
                  Não foi possível carregar os serviços.
                </span>
              )}
              {!servicesLoading && !servicesError && services.length === 0 && (
                <span className="mt-1 block text-xs text-amber-700">
                  Nenhum serviço ativo disponível.
                </span>
              )}
            </label>
            <Input
              label="Data do atendimento"
              type="date"
              value={date}
              onChange={(event) => changeDate(event.target.value)}
              min={todayInTimeZone(timezone)}
              required
            />
          </div>

          {isAdmin && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Profissional (opcional)
              </span>
              <select
                value={professionalId}
                onChange={(event) => setProfessionalId(event.target.value)}
                disabled={teamLoading || professionals.length === 0}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400 disabled:bg-zinc-50"
              >
                <option value="">Atribuição automática</option>
                {professionals.map((member: TeamMember) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              {teamError && (
                <span className="mt-1 block text-xs text-rose-600">
                  Não foi possível carregar a equipe; o agendamento seguirá sem atribuição manual.
                </span>
              )}
            </label>
          )}

          <section aria-labelledby="available-slots-title">
            <div className="mb-2 flex items-center gap-2">
              <Clock3 className="size-4 text-zinc-500" />
              <h3 id="available-slots-title" className="text-sm font-semibold text-zinc-800">
                Horários disponíveis
              </h3>
            </div>
            {!serviceId || !date ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                Escolha um serviço e uma data para consultar os horários.
              </p>
            ) : slotsLoading ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500" role="status">
                Carregando horários...
              </p>
            ) : slotsError ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                Não foi possível carregar os horários. Tente novamente.
              </p>
            ) : availableSlots.length === 0 ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Não há horários livres nessa data. Escolha outra data.
              </p>
            ) : (
              <div
                className="grid grid-cols-3 gap-2 sm:grid-cols-5"
                role="group"
                aria-label="Selecione um horário"
              >
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={selectedSlot === slot}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setSaveError('');
                    }}
                    className={`min-h-11 rounded-xl border px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${selectedSlot === slot ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </section>

          {settingsLoading && (
            <p className="text-xs text-zinc-500" role="status">
              Carregando configurações do estabelecimento...
            </p>
          )}
          {settingsError && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              role="alert"
            >
              Não foi possível carregar as configurações do estabelecimento para consultar os
              horários.
            </p>
          )}
          {saveError && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              role="alert"
            >
              {saveError}
            </p>
          )}

          <footer className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t border-zinc-100 bg-white px-5 py-4 sm:-mx-7 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !serviceId ||
                !date ||
                !selectedSlot ||
                (mode === 'existing'
                  ? !selectedCustomer
                  : !customerName.trim() || phoneDigits.length < 10) ||
                (isAdmin && settingsLoading)
              }
            >
              {createMutation.isPending ? (
                <CalendarPlus className="size-4 animate-pulse" />
              ) : (
                <Check className="size-4" />
              )}
              {createMutation.isPending ? 'Salvando...' : 'Confirmar agendamento'}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
};
