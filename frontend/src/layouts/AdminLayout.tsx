import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Scissors, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { BrandMark } from '@/components/ui/BrandMark';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: CalendarDays },
  { to: '/admin/servicos', label: 'Serviços', icon: Scissors },
  { to: '/admin/equipe', label: 'Equipe', icon: Users },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-zinc-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-white shadow-sm md:flex">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-5">
          <BrandMark small />
          <div className="leading-tight">
            <p className="text-sm font-bold text-zinc-900">StudioFy</p>
            <p className="text-[11px] text-zinc-400">Painel de gestão</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-100 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-semibold text-zinc-800">{user?.name}</p>
              <p className="text-[10px] text-zinc-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden">
        <MobileToolbar />
      </div>

      {/* Content */}
      <main className="flex-1 md:ml-64">
        <div className="px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const MobileToolbar: React.FC = () => {
  const { signOut } = useAuth();
  return (
    <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
      <Link to="/admin" className="flex items-center gap-2">
        <BrandMark small />
        <span className="text-sm font-bold text-zinc-900">StudioFy</span>
      </Link>
      <div className="flex items-center gap-2">
        <button
          onClick={signOut}
          className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
          aria-label="Sair"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
};
