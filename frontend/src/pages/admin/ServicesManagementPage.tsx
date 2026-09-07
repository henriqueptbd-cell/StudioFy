import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createSessionService } from '@/services/tenantServices';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);

  const canCreate = user?.role === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = Number(form.durationMinutes);
    const price = Number(form.price.replace(',', '.'));
    if (!form.name.trim() || !duration || Number.isNaN(price) || price <= 0) {
      toast.error('Preencha nome, duração e um preço válido.');
      return;
    }
    try {
      setSaving(true);
      await createSessionService({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        durationMinutes: duration,
        price,
      });
      toast.success('Serviço cadastrado com sucesso!');
      setForm(initial);
    } catch {
      toast.error('Não foi possível cadastrar o serviço.');
    } finally {
      setSaving(false);
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

        <div className="mt-5 flex items-center justify-end">
          <Button type="submit" disabled={!canCreate || saving}>
            <Plus className="size-4" />
            {saving ? 'Salvando...' : 'Cadastrar serviço'}
          </Button>
        </div>
      </form>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
        💡 A listagem, edição e ativação/desativação de serviços serão habilitadas quando a API
        administrativa de serviços estiver completa. O cadastro acima já funciona.
      </div>
    </div>
  );
};
