import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark } from '@/components/ui/BrandMark';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { login } from '@/services/auth';
import { DEV_DEFAULT_SLUG } from '@/config';

export const LoginPage: React.FC = () => {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation() as { state?: { from?: Location } };

    const [form, setForm] = useState({
        tenantSlug: DEV_DEFAULT_SLUG,
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.tenantSlug.trim() || !form.email.trim() || !form.password) return;
        try {
            setLoading(true);
            const data = await login(form.tenantSlug, form.email, form.password);
            signIn(data.token, data.user);
            const dest = location.state?.from?.pathname || '/admin/dashboard';
            navigate(dest, { replace: true });
        } catch {
            toast.error('E-mail, senha ou estabelecimento inválidos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <BrandMark />
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900">
                            Acesso do Estabelecimento
                        </h1>
                        <p className="mt-1 text-xs text-zinc-500">
                            Entre para gerir sua agenda e serviços.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
                >
                    <Input
                        label="Slug do estabelecimento"
                        required
                        value={form.tenantSlug}
                        leftIcon={<Store className="size-4" />}
                        onChange={(e) =>
                            setForm({ ...form, tenantSlug: e.target.value })
                        }
                    />
                    <Input
                        label="E-mail"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="voce@seunegocio.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <Input
                        label="Senha"
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                        }
                    />
                    <Button
                        type="submit"
                        fullWidth
                        disabled={loading}
                        className="mt-1"
                        size="lg"
                    >
                        <LogIn className="size-4" />
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>

                <p className="mt-4 text-center text-[11px] text-zinc-400">
                    Credenciais fornecidas no provisionamento do seu
                    estabelecimento.
                </p>
            </div>
        </div>
    );
};
