import React, { useEffect } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useTenantBySlug } from '@/hooks/useTenant';
import { BookingProvider } from '@/contexts/BookingContext';

export const PublicScope: React.FC = () => {
  const params = useParams<{ slug: string }>();
  const slug = params.slug as string;

  const { data: tenant, isLoading, error } = useTenantBySlug(slug);

  // Injeta variáveis de tema (white-label) quando o tenant carrega.
  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;
    root.style.setProperty('--primary-color', tenant.primaryColor || '#15803d');
    root.style.setProperty('--secondary-color', '#1e293b');
  }, [tenant]);

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty('--primary-color', '#15803d');
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Carregando estabelecimento...</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-red-500">Estabelecimento não encontrado ou indisponível.</p>
        <p className="mt-2 text-xs text-zinc-400">
          Verifique o endereço digitado e tente novamente.
        </p>
      </div>
    );
  }

  return (
    <BookingProvider tenant={tenant} slug={slug}>
      <Outlet />
    </BookingProvider>
  );
};
