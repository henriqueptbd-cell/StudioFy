import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { usePublicServices } from '@/hooks/useTenant';
import { PublicHeader } from '@/components/public/PublicHeader';
import { ServiceCard } from '@/components/public/ServiceCard';
import { PublicFooter } from '@/components/public/PublicFooter';
import { BookingSteps } from '@/components/public/BookingSteps';
import { Button } from '@/components/ui/Button';
import { useBooking } from '@/contexts/BookingContext';

export const ServiceSelectionPage: React.FC = () => {
  const { tenant, slug, service: chosen, setService } = useBooking();
  const { data: services = [], isLoading } = usePublicServices(slug);

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-[520px] px-5 py-6">
        <PublicHeader tenant={tenant} />

        <div className="mt-7">
          <BookingSteps
            steps={['Serviço', 'Horário', 'Dados', 'Confirmar']}
            activeIndex={0}
            tenantColor={tenant.primaryColor}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Agende seu momento
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
            Escolha o serviço
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-xs text-zinc-400">Buscando serviços disponíveis...</p>
          ) : services.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500">
              Este estabelecimento ainda não possui serviços disponíveis para agendamento.
            </p>
          ) : (
            services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={chosen?.id === service.id}
                tenantColor={tenant.primaryColor}
                onSelect={() => setService(service)}
              />
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Link
            to={`/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-700"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          {chosen ? (
            <Link
              to={`/${slug}/agendar/horario`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{
                backgroundColor: tenant.primaryColor || 'var(--primary-color)',
              }}
            >
              Continuar <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Button type="button" disabled>
              Continuar
            </Button>
          )}
        </div>

        <PublicFooter />
      </div>
    </div>
  );
};
