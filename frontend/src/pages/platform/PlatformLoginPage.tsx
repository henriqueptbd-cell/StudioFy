import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformLogin } from '@/services/platformApi';
import { extractErrorMessage } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const PlatformLoginPage: React.FC = () => {
  const { isAuthenticated, signIn } = usePlatformAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/superadmin" replace />;
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await platformLogin(email.trim(), password);
      signIn(result.token, result.admin);
      navigate('/superadmin', { replace: true });
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_-35px_rgba(15,23,42,.25)] sm:p-9">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-950 text-white">
          <ShieldCheck className="size-6" />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[.22em] text-indigo-700">
          StudioFy · Plataforma
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
          Console de operações
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Acesso restrito à administração da plataforma.
        </p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <Input
            label="E-mail administrativo"
            type="email"
            autoComplete="username"
            placeholder="admin@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            fullWidth
            disabled={isLoading}
            className="mt-2 bg-indigo-950 hover:bg-indigo-900"
          >
            {isLoading ? (
              'Validando acesso…'
            ) : (
              <>
                Entrar na plataforma <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
        <div className="mt-6 flex items-center gap-2 border-t border-zinc-100 pt-5 text-xs text-zinc-400">
          <LockKeyhole className="size-3.5" /> Ambiente administrativo protegido
        </div>
      </section>
    </main>
  );
};
