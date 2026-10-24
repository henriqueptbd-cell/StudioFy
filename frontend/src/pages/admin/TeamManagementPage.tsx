import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { extractErrorMessage } from '@/services/api';
import { createTeamMember, fetchTeamMembers, updateTeamMember } from '@/services/team';
import { Role, TeamMember, UpdateTeamMemberPayload } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  PROFESSIONAL: 'Profissional',
};

interface CreateFormState {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const initialCreateForm: CreateFormState = {
  name: '',
  email: '',
  password: '',
  role: 'PROFESSIONAL',
};

interface EditFormState {
  name: string;
  role: Role;
  password: string;
}

const initialEditForm: EditFormState = {
  name: '',
  role: 'PROFESSIONAL',
  password: '',
};

export const TeamManagementPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(initialEditForm);

  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-team'],
    queryFn: fetchTeamMembers,
  });

  const createMutation = useMutation({
    mutationFn: createTeamMember,
    onSuccess: () => {
      toast.success('Membro cadastrado com sucesso!');
      setCreateForm(initialCreateForm);
      void queryClient.invalidateQueries({ queryKey: ['admin-team'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTeamMemberPayload }) =>
      updateTeamMember(id, payload),
    onSuccess: () => {
      toast.success('Membro atualizado.');
      setEditingId(null);
      setEditForm(initialEditForm);
      void queryClient.invalidateQueries({ queryKey: ['admin-team'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name.trim() || !createForm.email.trim() || createForm.password.length < 6) {
      toast.error('Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.');
      return;
    }

    createMutation.mutate({
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      role: createForm.role,
    });
  };

  const startEditing = (member: TeamMember) => {
    setEditingId(member.id);
    setEditForm({ name: member.name, role: member.role, password: '' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(initialEditForm);
  };

  const handleUpdate = (e: React.FormEvent, member: TeamMember) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      toast.error('Informe o nome do membro.');
      return;
    }

    const payload: UpdateTeamMemberPayload = {
      name: editForm.name.trim(),
      role: editForm.role,
    };

    if (editForm.password.trim()) {
      if (editForm.password.length < 6) {
        toast.error('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      payload.password = editForm.password;
    }

    updateMutation.mutate({ id: member.id, payload });
  };

  const toggleActive = (member: TeamMember) => {
    updateMutation.mutate({
      id: member.id,
      payload: { active: !member.active },
    });
  };

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Colaboradores
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Equipe</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastre profissionais, defina o papel de cada pessoa e controle o acesso ao painel.
        </p>
      </header>

      {!isAdmin && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Você possui a função {user?.role}. Somente administradores podem cadastrar ou alterar
          membros.
        </div>
      )}

      {isAdmin && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-zinc-900">Novo membro</h2>
          <p className="mt-1 text-xs text-zinc-500">
            A senha inicial deve ser compartilhada com o profissional; ele poderá usá-la para entrar
            no painel.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nome"
              required
              placeholder="Ex.: Ana Souza"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
            <Input
              label="E-mail"
              type="email"
              required
              placeholder="ana@studio.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <Input
              label="Senha inicial"
              type="password"
              required
              minLength={6}
              placeholder="Mínimo de 6 caracteres"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            />
            <Select
              label="Papel"
              value={createForm.role}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  role: e.target.value as Role,
                })
              }
            >
              <option value="PROFESSIONAL">Profissional</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="size-4" />
              {createMutation.isPending ? 'Cadastrando...' : 'Cadastrar membro'}
            </Button>
          </div>
        </form>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Membros da equipe</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
            {members.length}
          </span>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-zinc-400">Carregando equipe...</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-500">Falha ao carregar a equipe.</p>
        ) : members.length === 0 ? (
          <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <UserRound className="mx-auto size-9 text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-700">Nenhum membro cadastrado</p>
            <p className="mt-1 text-xs text-zinc-400">
              Cadastre o primeiro profissional para começar.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {members.map((member) => {
              const isSelf = member.id === user?.id;
              const isEditing = editingId === member.id;

              return (
                <li
                  key={member.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {member.name}
                          {isSelf && (
                            <span className="ml-1 text-xs font-normal text-zinc-400">(você)</span>
                          )}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500">
                          <Mail className="size-3" />
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                          member.role === 'ADMIN'
                            ? 'bg-violet-50 text-violet-700 ring-violet-200'
                            : 'bg-sky-50 text-sky-700 ring-sky-200'
                        }`}
                      >
                        <ShieldCheck className="size-3" />
                        {ROLE_LABELS[member.role]}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                          member.active
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 ring-zinc-200'
                        }`}
                      >
                        {member.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleUpdate(e, member)}
                      className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-zinc-50 p-3 sm:grid-cols-2"
                    >
                      <Input
                        label="Nome"
                        required
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            name: e.target.value,
                          })
                        }
                      />
                      <Select
                        label="Papel"
                        value={editForm.role}
                        disabled={isSelf}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            role: e.target.value as Role,
                          })
                        }
                      >
                        <option value="PROFESSIONAL">Profissional</option>
                        <option value="ADMIN">Administrador</option>
                      </Select>
                      <Input
                        label="Nova senha (opcional)"
                        type="password"
                        minLength={6}
                        placeholder="Deixe em branco para manter"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            password: e.target.value,
                          })
                        }
                      />
                      <div className="flex items-end justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={cancelEditing}>
                          <X className="size-3.5" />
                          Cancelar
                        </Button>
                        <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                          <Check className="size-3.5" />
                          Salvar
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      {isAdmin && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => startEditing(member)}>
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant={member.active ? 'outline' : 'secondary'}
                            size="sm"
                            disabled={isSelf || updateMutation.isPending}
                            onClick={() => toggleActive(member)}
                            className={member.active ? 'text-rose-600 hover:bg-rose-50' : ''}
                            title={
                              isSelf ? 'Você não pode desativar o próprio usuário.' : undefined
                            }
                          >
                            {member.active ? (
                              <UserX className="size-3.5" />
                            ) : (
                              <UserCheck className="size-3.5" />
                            )}
                            {member.active ? 'Desativar' : 'Ativar'}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
