import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  CalendarCheck,
  UserPlus,
  X,
  HelpCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark } from '@/components/ui/BrandMark';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { provisionTenant } from '@/services/auth';
import { maskPhone } from '@/utils/format';

/* -------------------- helpers -------------------- */

/** Gera um slug seguro a partir de um nome (usa apenas [a-z0-9-]). */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* -------------------- tooltip de ajuda -------------------- */

interface FieldTipProps {
  text: string;
  className?: string;
}

/** Balão de ajuda que aparece ao passar o mouse sobre o "?". */
const FieldTip: React.FC<FieldTipProps> = ({ text, className }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`relative inline-flex align-middle ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <HelpCircle className="size-4 text-zinc-400 transition hover:text-zinc-600" />
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-[11px] font-normal leading-relaxed text-zinc-600 shadow-lg"
        >
          {text}
          <span className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-zinc-200 bg-white" />
        </span>
      )}
    </span>
  );
};

/* -------------------- formulário -------------------- */

interface FormState {
  storeName: string;
  slug: string;
  phone: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const initialForm: FormState = {
  storeName: '',
  slug: '',
  phone: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

const ProvisionForm: React.FC<{
  onBusyChange: (busy: boolean) => void;
}> = ({ onBusyChange }) => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  // Atualiza o nome e, se o slug ainda não foi editado manualmente, gera de novo.
  const handleStoreName = (name: string) => {
    const nextSlug = slugTouched ? form.slug : slugify(name);
    setForm((f) => ({ ...f, storeName: name, slug: nextSlug }));
  };

  const handleSlug = (slug: string) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: slugify(slug) }));
  };

  const isValid =
    form.storeName.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    form.phone.replace(/\D/g, '').length >= 10 &&
    form.adminName.trim().length >= 2 &&
    /.+@.+\..+/.test(form.adminEmail) &&
    form.adminPassword.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !isValid) return;
    try {
      setLoading(true);
      onBusyChange(true);
      const data = await provisionTenant({
        tenant: {
          name: form.storeName.trim(),
          slug: form.slug.trim(),
          phone: form.phone.replace(/\D/g, ''),
        },
        admin: {
          name: form.adminName.trim(),
          email: form.adminEmail.trim(),
          password: form.adminPassword,
        },
      });
      signIn(data.token, data.user);
      toast.success('Estabelecimento criado! Acesso iniciado.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      onBusyChange(false);
      const axiosError = err as {
        response?: { status?: number; data?: { error?: { code?: string } } };
      };
      const already = axiosError.response?.status === 409;
      toast.error(
        already
          ? 'Este endereço (slug) já está em uso. Escolha outro.'
          : 'Não foi possível criar o estabelecimento. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  /* Layout do form em seções, com cabeçalho do destino do slug */
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-2xl bg-zinc-50 p-3">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
          <Store className="size-3.5" /> Seu estabelecimento
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="mb-1 block text-xs font-semibold text-zinc-600">Nome da loja</span>
              <FieldTip text="Ex.: 'Barbearia do João'. Gera automaticamente o endereço do seu site." />
            </div>
            <Input
              placeholder="Nome do seu negócio"
              autoFocus
              value={form.storeName}
              onChange={(e) => handleStoreName(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="mb-1 block text-xs font-semibold text-zinc-600">
                Endereço do site (slug)
              </span>
              <FieldTip text="Será o link público do seu salão. Você pode clicar e editar. Dica: quanto mais simples e curto, melhor." />
            </div>
            <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 focus-within:border-zinc-400">
              <span className="text-xs text-zinc-400">seu.saite/</span>
              <input
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                placeholder="barbearia-joao"
                value={form.slug}
                onChange={(e) => handleSlug(e.target.value)}
              />
              {form.slug && (
                <button
                  type="button"
                  onClick={() => {
                    setSlugTouched(false);
                    setForm((f) => ({
                      ...f,
                      slug: slugify(f.storeName),
                    }));
                  }}
                  className="shrink-0 rounded-md p-1 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-600"
                  aria-label="Regerar slug"
                  title="Regerar a partir do nome"
                >
                  ↻
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="mb-1 block text-xs font-semibold text-zinc-600">
                Telefone / WhatsApp
              </span>
              <FieldTip text="Usado para contato e para gerar links de WhatsApp dos seus agendamentos." />
            </div>
            <Input
              inputMode="tel"
              placeholder="(11) 91234-5678"
              leftIcon={<Phone className="size-4 text-zinc-400" />}
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phone: maskPhone(e.target.value),
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-50 p-3">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
          <UserPlus className="size-3.5" /> Conta de administrador
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="mb-1 block text-xs font-semibold text-zinc-600">Seu nome</span>
              <FieldTip text="Você será o administrador e terá acesso ao painel de gestão." />
            </div>
            <Input
              placeholder="Nome do responsável"
              leftIcon={<User className="size-4 text-zinc-400" />}
              value={form.adminName}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  adminName: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="mb-1 block text-xs font-semibold text-zinc-600">E-mail</span>
              <FieldTip text="Será usado para entrar no painel. Não será exibido publicamente." />
            </div>
            <Input
              type="email"
              autoComplete="email"
              placeholder="voce@seunegocio.com"
              leftIcon={<Mail className="size-4 text-zinc-400" />}
              value={form.adminEmail}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  adminEmail: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="mb-1 block text-xs font-semibold text-zinc-600">Senha</span>
              <FieldTip text="Mínimo de 6 caracteres. Guarde bem: é ela que dá acesso ao painel." />
            </div>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo de 6 caracteres"
              leftIcon={<Lock className="size-4 text-zinc-400" />}
              value={form.adminPassword}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  adminPassword: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>

      <Button type="submit" fullWidth size="lg" disabled={loading || !isValid}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        {loading ? 'Criando...' : 'Criar meu acesso'}
      </Button>
    </form>
  );
};

/* -------------------- página (landing) -------------------- */

const FEATURES = [
  { icon: CalendarCheck, title: 'Agendamento online', text: 'Clientes marcam pelo seu link.' },
  { icon: Store, title: 'Seu site público', text: 'Página própria com sua marca.' },
  { icon: UserPlus, title: 'Gestão simples', text: 'Serviços, agenda e equipe em um só lugar.' },
];

export const ProvisionPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeAllowed = !busy;
  const baseHost = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : 'seu.saite'),
    [],
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      {/* Header institucional */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <BrandMark small />
          <span className="text-sm font-bold text-zinc-900">StudioFy</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setBusy(false);
            setOpen(true);
          }}
        >
          Iniciar cadastro
        </Button>
      </header>

      {/* Hero */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
          <Store className="size-3.5 text-green-700" />
          Sua agenda no WhatsApp e na web
        </div>
        <h1 className="max-w-2xl text-3xl font-black leading-tight text-zinc-900 sm:text-4xl">
          Leve seu salão para o online em minutos,{' '}
          <span className="text-green-700">sem complicação</span>.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-500">
          Crie seu espaço, ganhe um link de agendamento e receba mais clientes com uma reserva
          simples, rápida e no seu estilo.
        </p>

        <Button
          size="lg"
          className="mt-8"
          onClick={() => {
            setBusy(false);
            setOpen(true);
          }}
        >
          <Store className="size-4" />
          Iniciar cadastro agora
        </Button>

        {/* Diferenciais compactos */}
        <div className="mt-14 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm"
            >
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <Icon className="size-5" />
              </div>
              <p className="text-sm font-bold text-zinc-900">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{text}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Rodapé institucional mínimo */}
      <footer className="border-t border-zinc-200 px-6 py-4 text-center text-[11px] text-zinc-400">
        Os clientes só veem o seu salão — {baseHost}/seu-slug
      </footer>

      {/* Modal central */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm"
          onClick={() => closeAllowed && setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Criar meu estabelecimento</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Poucos campos e você já começa.</p>
              </div>
              <button
                type="button"
                onClick={() => closeAllowed && setOpen(false)}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40"
                aria-label="Fechar"
                disabled={!closeAllowed}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-5 py-4 scrollbar-hidden">
              <ProvisionForm onBusyChange={setBusy} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
