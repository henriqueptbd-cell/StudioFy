import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Building2, LogOut, ShieldCheck } from 'lucide-react';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { Button } from '@/components/ui/Button';

export const PlatformLayout: React.FC = () => {
  const { admin, signOut } = usePlatformAuth();
  const navigate = useNavigate();
  const leave = () => {
    signOut();
    navigate('/superadmin/login', { replace: true });
  };
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-950 text-white">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-950">
                StudioFy <span className="font-medium text-zinc-400">/ Plataforma</span>
              </p>
              <p className="hidden text-xs text-zinc-500 sm:block">Console de operações</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-right sm:flex">
              <span className="flex size-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-800">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="max-w-40 truncate text-xs font-semibold text-zinc-800">
                  {admin?.name}
                </p>
                <p className="max-w-40 truncate text-[11px] text-zinc-400">{admin?.email}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={leave}
              aria-label="Sair da console"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};
