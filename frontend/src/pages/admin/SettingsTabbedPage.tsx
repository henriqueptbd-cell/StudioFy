import React, { useState } from 'react';
import { Building2, Palette, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

export const SettingsTabbedPage: React.FC = () => {
    const [active, setActive] = useState('perfil');

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
                    Personalize sua loja. Estas opções serão conectadas à API de
                    configuração em uma próxima etapa.
                </p>
            </header>

            <div className="mb-6 flex gap-2 overflow-x-auto">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActive(key)}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                            active === key
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
                        }`}
                    >
                        <Icon className="size-4" />
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex max-w-xl flex-col rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                    <Palette className="size-7" />
                </span>
                <h2 className="mt-4 font-semibold text-zinc-800">
                    Apenas visual (placeholder)
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                    As abas Perfil da Loja, Estética &amp; Tema e Horários ainda
                    aguardam a API administrativa de configuração. A aba{' '}
                    <strong>{TABS.find((t) => t.key === active)?.label}</strong>{' '}
                    está selecionada apenas na interface.
                </p>
            </div>
        </div>
    );
};
