import React, { useState } from 'react';
import { Building2, Palette, Clock, Save, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchTenantSettings,
  updateTenantProfile,
  saveSchedule,
} from '@/services/tenantSettings';
import { ScheduleDay } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/BrandMark';
import { cn } from '@/utils/cn';

interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { key: 'perfil', label: 'Perfil da Loja', icon: Building2 },
  { key: 'estetica', label: 'Estética & Tema', icon: Palette },
  { key: 'horarios', label: 'Horários', icon: Clock },
];

const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

const COLOR_PRESETS = ['#15803d', '#0ea5e9', '#7c3aed', '#db2777', '#ea580c', '#0f172a'];

export const SettingsTabbedPage: React.FC = () => {
  const { user } = useAuth();
  const [active, setActive] = useState('perfil');

  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: fetchTenantSettings,
  });

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Preferências
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Personalize o perfil, a identidade visual e os horários de funcionamento
          do seu estabelecimento.
        </p>
      </header>

      {!isAdmin && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Você possui a função {user?.role}. Somente administradores podem editar
          as configurações da loja.
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
              active === key
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-zinc-400">
          Carregando configurações...
        </p>
      ) : error || !data ? (
        <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">
            Não foi possível carregar as configurações.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          {active === 'perfil' && (
            <ProfileTab initial={data.tenant} isAdmin={isAdmin} />
          )}
          {active === 'estetica' && (
            <ThemeTab initial={data.tenant} isAdmin={isAdmin} />
          )}
          {active === 'horarios' && (
            <ScheduleTab initial={data.schedule} isAdmin={isAdmin} />
          )}
        </>
      )}
    </div>
  );
};

// ==== Perfil da Loja ====

const ProfileTab: React.FC<{
  initial: { name: string; phone: string };
  isAdmin: boolean;
}> = ({ initial, isAdmin }) => {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => updateTenantProfile({ name, phone }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: () => toast.error('Não foi possível salvar o perfil.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Preencha o nome e o telefone.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Input
          label="Nome do estabelecimento"
          disabled={!isAdmin}
          placeholder="Ex.: Studio Beleza"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mt-3">
          <Input
            label="Telefone / WhatsApp"
            disabled={!isAdmin}
            placeholder="Ex.: (11) 91234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Este nome e telefone aparecem no link público de agendamento da sua
          loja.
        </p>
        <div className="mt-5 flex items-center justify-end">
          <Button type="submit" disabled={!isAdmin || mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar perfil
          </Button>
        </div>
      </form>
    </div>
  );
};

// ==== Estética & Tema ====

const ThemeTab: React.FC<{
  initial: {
    name: string;
    primaryColor?: string | null;
    logoUrl?: string | null;
  };
  isAdmin: boolean;
}> = ({ initial, isAdmin }) => {
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor || '#15803d');
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl || '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      updateTenantProfile({
        primaryColor,
        logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast.success('Tema atualizado com sucesso!');
    },
    onError: () => toast.error('Não foi possível salvar o tema.'),
  });

  return (
    <div className="max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <BrandMark color={primaryColor} small={false} />
          <div>
            <p className="text-sm font-semibold text-zinc-800">
              {initial.name || 'Sua loja'}
            </p>
            <p className="text-[11px] text-zinc-400">
              Pré-visualização da marca no link público
            </p>
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold text-zinc-600">Cor principal</p>
        <div className="mb-1 flex items-center gap-2">
          <span
            className="size-10 shrink-0 rounded-xl border border-zinc-200"
            style={{ backgroundColor: primaryColor }}
          />
          <Input
            className="flex-1"
            aria-label="Código hex da cor"
            disabled={!isAdmin}
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#15803d"
          />
        </div>
        <div className="mb-5 mt-3 flex gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={!isAdmin}
              onClick={() => setPrimaryColor(preset)}
              className={cn(
                'size-9 rounded-full border border-zinc-200 transition',
                primaryColor === preset && 'ring-2 ring-zinc-900 ring-offset-2'
              )}
              style={{ backgroundColor: preset }}
              aria-label={`Usar cor ${preset}`}
            />
          ))}
        </div>

        <div>
          <Input
            label="URL do logo (opcional)"
            disabled={!isAdmin}
            placeholder="https://.../logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>

        <div className="mt-5 flex items-center justify-end">
          <Button type="submit" disabled={!isAdmin || mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar tema
          </Button>
        </div>
      </form>
    </div>
  );
};

// ==== Horários de Funcionamento ====

interface ScheduleDraft extends ScheduleDay {
  id: number;
}

const defaultDayDraft = (dayOfWeek: number): ScheduleDraft => ({
  id: dayOfWeek,
  dayOfWeek,
  openTime: '09:00',
  closeTime: '18:00',
  isClosed: false,
});

const ScheduleTab: React.FC<{
  initial: ScheduleDay[];
  isAdmin: boolean;
}> = ({ initial, isAdmin }) => {
  const [days, setDays] = useState<ScheduleDraft[]>(() => {
    if (initial && initial.length === 7) {
      return WEEKDAYS.map((_, i) => {
        const found = initial.find((d) => d.dayOfWeek === i);
        return found ? { ...found, id: i } : defaultDayDraft(i);
      });
    }
    return WEEKDAYS.map((_, i) => defaultDayDraft(i));
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      saveSchedule(
        days.map(({ dayOfWeek, openTime, closeTime, isClosed }) => ({
          dayOfWeek,
          openTime,
          closeTime,
          isClosed,
        }))
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast.success('Horários de funcionamento salvos!');
    },
    onError: () =>
      toast.error(
        'Não foi possível salvar os horários. Verifique se o horário de abertura é anterior ao de fechamento.'
      ),
  });

  const updateDay = (dayOfWeek: number, patch: Partial<ScheduleDraft>) => {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    );
  };

  return (
    <div className="max-w-xl">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-zinc-500">
          Defina o horário de funcionamento de cada dia. Os{' '}
          <span className="font-semibold text-zinc-700">dias fechados</span> não
          exibirão horários disponíveis para o cliente.
        </p>

        <div className="mt-4 space-y-3">
          {[...days]
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((day) => (
              <div
                key={day.dayOfWeek}
                className={cn(
                  'rounded-2xl border p-4 transition',
                  day.isClosed ? 'border-zinc-100 bg-zinc-50' : 'border-zinc-200 bg-white'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-zinc-800">
                    {WEEKDAYS[day.dayOfWeek]}
                  </span>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => updateDay(day.dayOfWeek, { isClosed: !day.isClosed })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-60',
                      day.isClosed ? 'bg-zinc-200' : 'bg-emerald-500'
                    )}
                    aria-pressed={!day.isClosed}
                  >
                    <span
                      className={cn(
                        'inline-block size-5 transform rounded-full bg-white shadow transition',
                        day.isClosed ? 'translate-x-1' : 'translate-x-5'
                      )}
                    />
                  </button>
                </div>

                {day.isClosed ? (
                  <p className="mt-2 text-xs font-semibold text-zinc-400">Fechado</p>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-zinc-500">
                        Abertura
                      </span>
                      <input
                        type="time"
                        disabled={!isAdmin}
                        value={day.openTime}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, { openTime: e.target.value })
                        }
                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-zinc-500">
                        Fechamento
                      </span>
                      <input
                        type="time"
                        disabled={!isAdmin}
                        value={day.closeTime}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, { closeTime: e.target.value })
                        }
                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="mt-5 flex items-center justify-end">
          <Button onClick={() => mutation.mutate()} disabled={!isAdmin || mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar horários
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-zinc-400">
        Os slots são gerados a cada 30 minutos entre os horários de abertura e
        fechamento, respeitando a duração de cada serviço.
      </p>
    </div>
  );
};
