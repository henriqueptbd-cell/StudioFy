import React from 'react';
import { Link } from 'react-router-dom';
import {
    CalendarClock,
    CalendarDays,
    Scissors,
    Sparkles,
    Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const DashboardPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div>
            <header className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Painel
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                    Olá, {user?.name?.split(' ')[0] || 'Admin'} 👋
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Gerencie sua agenda e seus serviços em um só lugar.
                </p>
            </header>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                    icon={<CalendarClock className="size-5" />}
                    label="Hoje"
                    value="—"
                    hint="Integração pendente"
                />
                <StatCard
                    icon={<CalendarDays className="size-5" />}
                    label="Pendentes"
                    value="—"
                    hint="Ver agendamentos"
                />
                <StatCard
                    icon={<Users className="size-5" />}
                    label="Clientes"
                    value="—"
                    hint="Via agenda"
                />
                <StatCard
                    icon={<Scissors className="size-5" />}
                    label="Serviços"
                    value="—"
                    hint="Cadastrar novo"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <QuickAction
                    to="/admin/agendamentos"
                    icon={<CalendarDays className="size-5" />}
                    title="Ver agendamentos"
                    description="Acompanhe, confirme e gerencie as solicitações do dia."
                />
                <QuickAction
                    to="/admin/servicos"
                    icon={<Scissors className="size-5" />}
                    title="Gerenciar serviços"
                    description="Cadastre novos serviços e preços do estabelecimento."
                />
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
                <Sparkles className="size-4 text-amber-500" />
                Dica: os cartões do topo serão conectados à API de dashboard em
                uma próxima etapa.
            </div>
        </div>
    );
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    hint: string;
}> = ({ icon, label, value, hint }) => (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
            {icon}
        </span>
        <p className="mt-3 text-xs text-zinc-400">{label}</p>
        <p className="text-xl font-bold text-zinc-900">{value}</p>
        <p className="mt-1 truncate text-[10px] text-zinc-400">{hint}</p>
    </div>
);

const QuickAction: React.FC<{
    to: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}> = ({ to, icon, title, description }) => (
    <Link
        to={to}
        className="group flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
    >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
            {icon}
        </span>
        <div className="min-w-0">
            <p className="font-semibold text-zinc-900 group-hover:underline">
                {title}
            </p>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
    </Link>
);
