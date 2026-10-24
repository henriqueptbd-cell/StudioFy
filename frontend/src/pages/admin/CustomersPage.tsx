import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Contact, Search } from 'lucide-react';
import { fetchAdminCustomers } from '@/services/customers';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
  }
  if (digits.length === 10) {
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
  }
  return raw;
}

export const CustomersPage: React.FC = () => {
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: () => fetchAdminCustomers(search || undefined),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(term.trim());
  };

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Contatos
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Clientes</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Consulte os clientes que já agendaram no seu estabelecimento.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mb-5 flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Nome ou telefone"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Button type="submit">
          <Search className="size-4" />
          Buscar
        </Button>
      </form>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-zinc-400">Carregando clientes...</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-500">Falha ao carregar os clientes.</p>
      ) : customers.length === 0 ? (
        <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <Contact className="mx-auto size-9 text-zinc-300" />
          <p className="mt-3 text-sm font-semibold text-zinc-700">Nenhum cliente encontrado</p>
          <p className="mt-1 text-xs text-zinc-400">
            Ajuste a busca ou aguarde novos agendamentos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
                {customer.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900">{customer.name}</p>
                <p className="text-xs text-zinc-500">{formatPhone(customer.phone)}</p>
              </div>
              <p className="shrink-0 text-[11px] text-zinc-400">
                Desde {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
