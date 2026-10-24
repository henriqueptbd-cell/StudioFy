import React, { useState } from 'react';
import { Plus, ClipboardList, Timer, Pencil, Power, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { createSessionService, fetchAdminServices, updateSessionService } from '@/services/tenantServices';
import { AdminService } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';

interface FormState {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
}

const initial: FormState = {
  name: '',
  description: '',
  durationMinutes: '30',
  price: '',
};

export const ServicesManagementPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canCreate = user?.role === 'ADMIN';

  const {
    data: services = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-services'],
    queryFn: fetchAdminServices,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = Number(form.durationMinutes);
    const price = Number(form.price.replace(',', '.'));
    if (!form.name.trim() || !duration || Number.isNaN(price) || price <= 0) {
      toast.error('Preencha nome, duração e um preço válido.');
      return;
    }
    const description = form.description.trim();
    try {
      setSaving(true);
      if (editingId) {
        await updateSessionService(editingId, {
          name: form.name.trim(),
          description: description || null,
          durationMinutes: duration,
          price,
        });
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await createSessionService({
          name: form.name.trim(),
          description: description || undefined,
          durationMinutes: duration,
          price,
        });
        toast.success('Serviço cadastrado com sucesso!');
      }
      setForm(initial);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    } catch {
      toast.error(
        editingId ? 'Não foi possível atualizar o serviço.' : 'Não foi possível cadastrar o serviço.',
      );
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (service: AdminService) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? '',
      durationMinutes: String(service.durationMinutes),
      price: service.price,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initial);
  };

  const toggleActive = async (service: AdminService) => {
    try {
      await updateSessionService(service.id, { active: !service.active });
      toast.success(service.active ? 'Serviço desativado.' : 'Serviço ativado.');
      await queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    } catch {
      toast.error('Não foi possível alterar o status do serviço.');
    }
  };

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Catálogo</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Serviços</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastre os serviços oferecidos pelo seu estabelecimento.
        </p>
      </header>

      {!canCreate && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Você possui a função {user?.role}. Somente administradores podem cadastrar novos serviços.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Input
          label="Nome do serviço"
          required
          disabled={!canCreate}
          placeholder="Ex.: Corte de cabelo masculino"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="mt-3">
          <Input
            label="Descrição (opcional)"
            disabled={!canCreate}
            placeholder="Ex.: Corte tradicional com acabamento"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Input
            label="Duração (minutos)"
            type="number"
            min={5}
            step={5}
            disabled={!canCreate}
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
          />
          <Input
            label="Preço (R$)"
            inputMode="decimal"
            disabled={!canCreate}
            placeholder="45,00"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {editingId && (
            <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
              <X className="size-4" />
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={!canCreate || saving}>
            {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar serviço'}
          </Button>
        </div>
      </form>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Serviços cadastrados</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
            {services.length}
          </span>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-zinc-400">Carregando serviços...</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-500">Falha ao carregar os serviços.</p>
        ) : services.length === 0 ? (
          <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <ClipboardList className="mx-auto size-9 text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-700">Nenhum serviço cadastrado</p>
            <p className="mt-1 text-xs text-zinc-400">
              Cadastre o primeiro serviço acima para começar a receber agendamentos.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {services.map((service) => (
              <li
                key={service.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{service.name}</p>
                    <p className="mt-0.5 text-xs font-medium text-emerald-600">
                      {formatCurrency(service.price)}
                    </p>
                    {service.description ? (
                      <p className="mt-1 text-xs text-zinc-500">{service.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        service.active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {service.active ? 'Ativo' : 'Inativo'}
                    </span>
                    {canCreate && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(service)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100"
                        >
                          <Pencil className="size-3" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(service)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold hover:bg-zinc-100 ${
                            service.active ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          <Power className="size-3" /> {service.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-400">
                  <Timer className="size-3.5" />
                  {service.durationMinutes} min
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
