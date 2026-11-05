import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Archive,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  ExternalLink,
  LoaderCircle,
  Pause,
  Play,
  Search,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractErrorMessage } from '@/services/api';
import {
  archivePlatformTenant,
  fetchPlatformTenants,
  fetchTenantAudit,
  restorePlatformTenant,
  updatePlatformTenantProfile,
  updatePlatformTenantStatus,
} from '@/services/platformApi';
import {
  PlatformTenant,
  PlatformTenantStatus,
  RestorableTenantStatus,
  TenantProfilePayload,
} from '@/types/platform';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: { value: PlatformTenantStatus | ''; label: string }[] = [
  { value: '', label: 'Operacionais (ativos e pausados)' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'PAUSED', label: 'Pausados' },
  { value: 'ARCHIVED', label: 'Arquivados' },
];
const STATUS_LABELS: Record<PlatformTenantStatus, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  ARCHIVED: 'Arquivado',
};
const STATUS_COLORS: Record<PlatformTenantStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  PAUSED: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  ARCHIVED: 'bg-zinc-100 text-zinc-600 ring-zinc-500/15',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}
export const PlatformDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<PlatformTenantStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PlatformTenant | null>(null);
  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const tenantsQuery = useQuery({
    queryKey: ['platform-tenants', page, PAGE_SIZE, searchQuery, status],
    queryFn: () =>
      fetchPlatformTenants({
        page,
        pageSize: PAGE_SIZE,
        q: searchQuery || undefined,
        status: status || undefined,
      }),
  });
  const tenants = useMemo(() => tenantsQuery.data?.items ?? [], [tenantsQuery.data?.items]);
  const pagination = tenantsQuery.data?.pagination;
  const pageStats = useMemo(
    () =>
      tenants.reduce(
        (stats, tenant) => ({
          active: stats.active + Number(tenant.status === 'ACTIVE'),
          paused: stats.paused + Number(tenant.status === 'PAUSED'),
          archived: stats.archived + Number(tenant.status === 'ARCHIVED'),
          customers: {
            subtotal: stats.customers.subtotal + (tenant.metrics.customerCount ?? 0),
            hidden: stats.customers.hidden + Number(tenant.metrics.customerCount === null),
          },
          appointments: {
            subtotal: stats.appointments.subtotal + (tenant.metrics.appointments.total ?? 0),
            hidden: stats.appointments.hidden + Number(tenant.metrics.appointments.total === null),
          },
        }),
        {
          active: 0,
          paused: 0,
          archived: 0,
          customers: { subtotal: 0, hidden: 0 },
          appointments: { subtotal: 0, hidden: 0 },
        },
      ),
    [tenants],
  );

  const refresh = async (updatedTenant?: PlatformTenant) => {
    await queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-audit'] });
    if (updatedTenant) setSelected(updatedTenant);
  };

  const totalCount = pagination?.total ?? 0;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.19em] text-indigo-700">
            Visão geral
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Estabelecimentos
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gerencie o acesso e os dados públicos das contas da plataforma.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
          <Activity className="size-4 text-indigo-600" /> Operações da plataforma
        </div>
      </div>

      <section
        aria-label="Resumo dos estabelecimentos exibidos"
        className="grid grid-cols-2 gap-3 xl:grid-cols-5"
      >
        <SummaryCard
          label="Contas encontradas"
          value={totalCount}
          icon={<Building2 className="size-4" />}
          accent="text-indigo-700 bg-indigo-50"
        />
        <SummaryCard
          label="Ativos nesta página"
          value={pageStats.active}
          icon={<Check className="size-4" />}
          accent="text-emerald-700 bg-emerald-50"
        />
        <SummaryCard
          label="Pausados nesta página"
          value={pageStats.paused}
          icon={<Pause className="size-4" />}
          accent="text-amber-700 bg-amber-50"
        />
        <SummaryCard
          label={
            pageStats.customers.hidden
              ? 'Clientes conhecidos (subtotal)'
              : 'Clientes somados (página)'
          }
          value={
            pageStats.customers.hidden
              ? pageStats.customers.subtotal
                ? `≥${pageStats.customers.subtotal.toLocaleString('pt-BR')}`
                : 'Parcial'
              : pageStats.customers.subtotal
          }
          note={
            pageStats.customers.hidden
              ? `Há valores suprimidos em ${pageStats.customers.hidden} estabelecimento(s).`
              : undefined
          }
          icon={<Users className="size-4" />}
          accent="text-violet-700 bg-violet-50"
        />
        <SummaryCard
          label={
            pageStats.appointments.hidden
              ? 'Agendamentos conhecidos (subtotal)'
              : 'Agendamentos somados (página)'
          }
          value={
            pageStats.appointments.hidden
              ? pageStats.appointments.subtotal
                ? `≥${pageStats.appointments.subtotal.toLocaleString('pt-BR')}`
                : 'Parcial'
              : pageStats.appointments.subtotal
          }
          note={
            pageStats.appointments.hidden
              ? `Há valores suprimidos em ${pageStats.appointments.hidden} estabelecimento(s).`
              : undefined
          }
          icon={<Activity className="size-4" />}
          accent="text-sky-700 bg-sky-50"
        />
      </section>
      <p className="-mt-4 text-[11px] text-zinc-400">
        Os indicadores de clientes e agendamentos são totais agregados apenas dos estabelecimentos
        nesta página. Nenhum dado individual de cliente ou agendamento é exibido.
      </p>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Contas da plataforma</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Busque por nome ou slug e filtre por status.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-64">
              <span className="sr-only">Buscar estabelecimentos</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar estabelecimentos"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as PlatformTenantStatus | '');
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-44"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {tenantsQuery.isLoading ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-zinc-500">
            <LoaderCircle className="size-6 animate-spin text-indigo-700" />
            Carregando estabelecimentos…
          </div>
        ) : tenantsQuery.isError ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <p className="text-sm font-semibold text-zinc-800">Não foi possível carregar a lista</p>
            <p className="mt-1 max-w-md text-xs text-zinc-500">
              {extractErrorMessage(tenantsQuery.error)}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => void tenantsQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
              <Building2 className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-zinc-800">
              Nenhum estabelecimento encontrado
            </p>
            <p className="mt-1 text-xs text-zinc-500">Ajuste os filtros ou tente outra busca.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Estabelecimento</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Clientes</th>
                    <th className="px-4 py-3">Agendamentos</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-5 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="transition hover:bg-zinc-50/70">
                      <td className="px-5 py-4">
                        <TenantIdentity tenant={tenant} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-4 py-4 text-sm tabular-nums text-zinc-700">
                        {formatProtectedCount(tenant.metrics.customerCount)}
                      </td>
                      <td className="px-4 py-4 text-sm tabular-nums text-zinc-700">
                        {formatProtectedCount(tenant.metrics.appointments.total)}
                      </td>
                      <td className="px-4 py-4 text-xs text-zinc-500">
                        {formatDate(tenant.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelected(tenant)}>
                          Gerenciar <ExternalLink className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-100 md:hidden">
              {tenants.map((tenant) => (
                <article key={tenant.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <TenantIdentity tenant={tenant} />
                    <StatusBadge status={tenant.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-3">
                    <MiniMetric label="Clientes" value={tenant.metrics.customerCount} />
                    <MiniMetric label="Agendamentos" value={tenant.metrics.appointments.total} />
                    <MiniMetric label="Serviços ativos" value={tenant.metrics.activeServiceCount} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">
                      Criado em {formatDate(tenant.createdAt)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setSelected(tenant)}>
                      Gerenciar <ExternalLink className="size-3.5" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-zinc-500">
                Exibindo {rangeStart}–{rangeEnd} de {totalCount.toLocaleString('pt-BR')}
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || tenantsQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <span className="min-w-20 text-center text-xs text-zinc-500">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || tenantsQuery.isFetching}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Próxima
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      {selected && (
        <TenantManagementDialog
          tenant={selected}
          onClose={() => setSelected(null)}
          onUpdated={refresh}
        />
      )}
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number | string;
  note?: string;
  icon: React.ReactNode;
  accent: string;
}> = ({ label, value, note, icon, accent }) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
    <span className={`inline-flex size-8 items-center justify-center rounded-xl ${accent}`}>
      {icon}
    </span>
    <p className="mt-3 text-xl font-bold tabular-nums text-zinc-950">
      {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
    </p>
    <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{label}</p>
    {note && <p className="mt-1 text-[9px] leading-3 text-amber-700">{note}</p>}
  </div>
);

const TenantIdentity: React.FC<{ tenant: PlatformTenant }> = ({ tenant }) => (
  <div className="flex min-w-0 items-center gap-3">
    {tenant.logoUrl ? (
      <img
        src={tenant.logoUrl}
        alt=""
        className="size-10 shrink-0 rounded-xl border border-zinc-100 bg-white object-cover"
      />
    ) : (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-800">
        {tenant.name.trim().charAt(0).toUpperCase() || 'E'}
      </span>
    )}
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-zinc-900">{tenant.name}</p>
      <p className="truncate text-xs text-zinc-400">/{tenant.slug}</p>
    </div>
  </div>
);
const StatusBadge: React.FC<{ status: PlatformTenantStatus }> = ({ status }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_COLORS[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);
const formatProtectedCount = (value: number | null): string =>
  value === null ? '<5 ocultado' : value.toLocaleString('pt-BR');
const MiniMetric: React.FC<{ label: string; value: number | null }> = ({ label, value }) => (
  <div>
    <p className="text-sm font-bold tabular-nums text-zinc-800">{formatProtectedCount(value)}</p>
    <p className="text-[10px] text-zinc-400">{label}</p>
  </div>
);

interface TenantManagementDialogProps {
  tenant: PlatformTenant;
  onClose: () => void;
  onUpdated: (tenant?: PlatformTenant) => Promise<void>;
}

const TenantManagementDialog: React.FC<TenantManagementDialogProps> = ({
  tenant,
  onClose,
  onUpdated,
}) => {
  const [name, setName] = useState(tenant.name);
  const [phone, setPhone] = useState(tenant.phone ?? '');
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl ?? '');
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor ?? '#4f46e5');
  const [profileReason, setProfileReason] = useState('');
  const [reason, setReason] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<RestorableTenantStatus>('ACTIVE');
  const queryClient = useQueryClient();
  const auditQuery = useQuery({
    queryKey: ['platform-audit', tenant.id],
    queryFn: () => fetchTenantAudit(tenant.id, 20),
  });

  const finishMutation = async (updated: PlatformTenant) => {
    await onUpdated(updated);
    setReason('');
    setProfileReason('');
  };
  const mutation = useMutation({
    mutationFn: async (
      input:
        | { kind: 'profile'; payload: TenantProfilePayload }
        | { kind: 'status'; status: 'ACTIVE' | 'PAUSED'; reason: string }
        | { kind: 'archive' | 'restore'; reason: string; status?: RestorableTenantStatus },
    ) => {
      if (input.kind === 'profile') return updatePlatformTenantProfile(tenant.id, input.payload);
      if (input.kind === 'status')
        return updatePlatformTenantStatus(tenant.id, input.status, input.reason);
      if (input.kind === 'archive') return archivePlatformTenant(tenant.id, input.reason);
      return restorePlatformTenant(tenant.id, input.status ?? 'ACTIVE', input.reason);
    },
    onSuccess: async (updated) => {
      await finishMutation(updated);
      await queryClient.invalidateQueries({ queryKey: ['platform-audit', tenant.id] });
    },
  });
  const errorMessage = mutation.isError ? extractErrorMessage(mutation.error) : '';

  const submitProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: TenantProfilePayload = {
      name: name.trim(),
      phone: phone.trim(),
      logoUrl: logoUrl.trim() || null,
      primaryColor: primaryColor.trim(),
      reason: profileReason.trim(),
    };
    mutation.mutate({ kind: 'profile', payload });
  };
  const submitAction = (
    event: React.FormEvent<HTMLFormElement>,
    kind: 'status' | 'archive' | 'restore',
    nextStatus?: RestorableTenantStatus,
  ) => {
    event.preventDefault();
    if (kind === 'status')
      mutation.mutate({
        kind,
        status: tenant.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED',
        reason: reason.trim(),
      });
    else if (kind === 'archive') mutation.mutate({ kind, reason: reason.trim() });
    else mutation.mutate({ kind, status: nextStatus, reason: reason.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-dialog-title"
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-[#f8f9fb] shadow-2xl sm:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="tenant-dialog-title" className="truncate text-lg font-bold text-zinc-950">
                {tenant.name}
              </h2>
              <StatusBadge status={tenant.status} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              /{tenant.slug} · Criado em {formatDate(tenant.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Edit3 className="size-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-zinc-900">Perfil público</h3>
              </div>
              <form className="space-y-3" onSubmit={submitProfile}>
                <Input
                  label="Nome do estabelecimento"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={120}
                />
                <Input
                  label="Telefone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={30}
                />
                <Input
                  label="URL do logo"
                  type="url"
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="https://…"
                />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
                    Cor principal
                  </span>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-2">
                    <input
                      aria-label="Selecionar cor principal"
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(primaryColor) ? primaryColor : '#4f46e5'}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      className="size-8 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <input
                      aria-label="Código da cor"
                      value={primaryColor}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
                      maxLength={20}
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
                    Motivo da alteração <span className="text-rose-600">*</span>
                  </span>
                  <textarea
                    value={profileReason}
                    onChange={(event) => setProfileReason(event.target.value)}
                    required
                    minLength={3}
                    rows={2}
                    placeholder="Descreva por que o perfil está sendo alterado"
                    className="w-full resize-y rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <p className="text-[11px] leading-4 text-zinc-400">
                  Slug e fuso horário não podem ser alterados por esta console.
                </p>
                <Button
                  type="submit"
                  size="sm"
                  disabled={mutation.isPending || !profileReason.trim()}
                >
                  <Check className="size-3.5" />
                  Salvar perfil
                </Button>
              </form>
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="size-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-zinc-900">Indicadores agregados</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TinyStat label="Clientes" value={tenant.metrics.customerCount} />
                <TinyStat label="Serviços ativos" value={tenant.metrics.activeServiceCount} />
                <TinyStat
                  label="Profissionais ativos"
                  value={tenant.metrics.activeProfessionalCount}
                />
                <TinyStat label="Agendamentos totais" value={tenant.metrics.appointments.total} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <TinyStat label="Pendentes" value={tenant.metrics.appointments.pending} />
                <TinyStat label="Confirmados" value={tenant.metrics.appointments.confirmed} />
                <TinyStat label="Recusados" value={tenant.metrics.appointments.rejected} />
                <TinyStat label="Cancelados" value={tenant.metrics.appointments.cancelled} />
                <TinyStat label="Concluídos" value={tenant.metrics.appointments.completed} />
              </div>
              <p className="mt-2 text-[10px] text-zinc-400">
                Somente totais; registros individuais não são carregados nem mostrados.
              </p>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="size-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-zinc-900">Acesso e status</h3>
              </div>
              {errorMessage && (
                <p
                  role="alert"
                  className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                >
                  {errorMessage}
                </p>
              )}
              {tenant.status === 'ARCHIVED' ? (
                <form
                  onSubmit={(event) => submitAction(event, 'restore', restoreStatus)}
                  className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-800">Restaurar estabelecimento</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      Escolha explicitamente o status de retorno.
                    </p>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-zinc-600">
                      Status após restaurar
                    </span>
                    <select
                      value={restoreStatus}
                      onChange={(event) =>
                        setRestoreStatus(event.target.value as RestorableTenantStatus)
                      }
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="PAUSED">Pausado</option>
                    </select>
                  </label>
                  <ReasonField value={reason} onChange={setReason} label="Motivo obrigatório" />
                  <Button type="submit" size="sm" disabled={mutation.isPending || !reason.trim()}>
                    <Play className="size-3.5" />
                    Restaurar
                  </Button>
                </form>
              ) : (
                <div className="space-y-3">
                  <form
                    onSubmit={(event) => submitAction(event, 'status')}
                    className="rounded-xl border border-zinc-200 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${tenant.status === 'PAUSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                      >
                        {tenant.status === 'PAUSED' ? (
                          <Play className="size-3.5" />
                        ) : (
                          <Pause className="size-3.5" />
                        )}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-zinc-800">
                          {tenant.status === 'PAUSED' ? 'Reativar conta' : 'Pausar conta'}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                          {tenant.status === 'PAUSED'
                            ? 'Permitir que o estabelecimento volte a operar.'
                            : 'Suspender temporariamente o acesso do estabelecimento.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <ReasonField value={reason} onChange={setReason} label="Motivo obrigatório" />
                      <Button
                        type="submit"
                        variant={tenant.status === 'PAUSED' ? 'primary' : 'outline'}
                        size="sm"
                        disabled={mutation.isPending || !reason.trim()}
                      >
                        {tenant.status === 'PAUSED' ? (
                          <Play className="size-3.5" />
                        ) : (
                          <Pause className="size-3.5" />
                        )}
                        {tenant.status === 'PAUSED' ? 'Reativar' : 'Pausar'}
                      </Button>
                    </div>
                  </form>
                  <form
                    onSubmit={(event) => submitAction(event, 'archive')}
                    className="rounded-xl border border-rose-200 bg-rose-50/40 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                        <Archive className="size-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-zinc-800">Arquivar conta</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                          A conta sairá da operação e exigirá restauração para voltar.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <ReasonField value={reason} onChange={setReason} label="Motivo obrigatório" />
                      <Button
                        type="submit"
                        variant="danger"
                        size="sm"
                        disabled={mutation.isPending || !reason.trim()}
                      >
                        <Archive className="size-3.5" />
                        Arquivar
                      </Button>
                    </div>
                  </form>
                </div>
              )}
              {mutation.isPending && (
                <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Salvando alteração…
                </p>
              )}
              {tenant.status === 'PAUSED' && tenant.pausedAt && (
                <p className="mt-3 text-[11px] text-zinc-400">
                  Pausado em {formatDate(tenant.pausedAt)}
                </p>
              )}
              {tenant.status === 'ARCHIVED' && tenant.archivedAt && (
                <p className="mt-3 text-[11px] text-zinc-400">
                  Arquivado em {formatDate(tenant.archivedAt)}
                </p>
              )}
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 text-indigo-700" />
                  <h3 className="text-sm font-bold text-zinc-900">Auditoria recente</h3>
                </div>
                {auditQuery.data && (
                  <span className="text-[10px] text-zinc-400">
                    Últimos {auditQuery.data.length}
                  </span>
                )}
              </div>
              {auditQuery.isLoading ? (
                <p className="flex items-center gap-2 py-4 text-xs text-zinc-500">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Carregando histórico…
                </p>
              ) : auditQuery.isError ? (
                <div className="py-2">
                  <p className="text-xs text-rose-700">Não foi possível carregar o histórico.</p>
                  <button
                    onClick={() => void auditQuery.refetch()}
                    className="mt-1 text-xs font-semibold text-indigo-700"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : auditQuery.data?.length ? (
                <ol className="max-h-72 divide-y divide-zinc-100 overflow-y-auto">
                  {auditQuery.data.map((entry) => (
                    <li key={entry.id} className="py-3 first:pt-1 last:pb-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold text-zinc-800">{entry.action}</p>
                        <time className="shrink-0 text-[10px] text-zinc-400">
                          {formatDate(entry.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-500">{entry.reason}</p>
                      <p className="mt-1 text-[10px] text-zinc-400">Por {entry.adminName}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-4 text-xs text-zinc-500">Nenhum evento de auditoria encontrado.</p>
              )}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
};

const TinyStat: React.FC<{ label: string; value: number | null }> = ({ label, value }) => (
  <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
    <p className="text-sm font-bold tabular-nums text-zinc-800">{formatProtectedCount(value)}</p>
    <p className="mt-0.5 text-[10px] text-zinc-500">{label}</p>
  </div>
);
const ReasonField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-semibold text-zinc-600">
      {label} <span className="text-rose-600">*</span>
    </span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
      minLength={3}
      rows={2}
      placeholder="Informe o motivo para auditoria"
      className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
    />
  </label>
);
