import React from 'react';
import { Wrench } from 'lucide-react';

export const TeamManagementPage: React.FC = () => {
    return (
        <div>
            <header className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Colaboradores
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                    Equipe
                </h1>
            </header>

            <div className="flex max-w-xl flex-col rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                    <Wrench className="size-7" />
                </span>
                <h2 className="mt-4 font-semibold text-zinc-800">
                    Gestão de equipe em breve
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                    O cadastro e convite de novos profissionais estará disponível
                    quando a API administrativa de membros da equipe for publicada
                    no backend.
                </p>
            </div>
        </div>
    );
};
