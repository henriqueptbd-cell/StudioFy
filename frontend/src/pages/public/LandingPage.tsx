import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck2, MapPin, Clock } from 'lucide-react';
import { useBooking } from '@/contexts/BookingContext';
import { Button } from '@/components/ui/Button';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const LandingPage: React.FC = () => {
    const { tenant, slug, reset } = useBooking();
    const navigate = useNavigate();

    // Começa um novo fluxo cada vez que o visitante volta para a vitrine.
    useEffect(() => {
        reset();
    }, [reset]);

    if (!tenant) return null;

    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="mx-auto w-full max-w-[520px] px-5 py-6">
                <PublicHeader tenant={tenant} />

                <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                        Bem-vindo(a)
                    </span>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">
                        Reserve seu horário
                        <span
                            className="block text-xl"
                            style={{ color: tenant.primaryColor || 'var(--primary-color)' }}
                        >
                            no melhor momento para você
                        </span>
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-zinc-500">
                        Escolha um serviço, selecione o dia e o horário disponível e
                        pronto. Sem cadastro — apenas seu nome e WhatsApp para a
                        confirmação.
                    </p>

                    <Button
                        fullWidth
                        size="lg"
                        className="mt-6"
                        onClick={() => navigate(`/${slug}/agendar/servicos`)}
                    >
                        <CalendarCheck2 className="size-4" />
                        Iniciar agendamento
                    </Button>
                </section>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <InfoCard icon={<Clock className="size-4" />} title="Rápido" text="Menos de 1 minuto" />
                    <InfoCard icon={<CalendarCheck2 className="size-4" />} title="Sem cadastro" text="Só nome e WhatsApp" />
                    <InfoCard icon={<MapPin className="size-4" />} title="Confirmação" text="Direto no WhatsApp" />
                </div>

                <PublicFooter />
            </div>
        </div>
    );
};

const InfoCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    text: string;
}> = ({ icon, title, text }) => (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
            {icon}
        </span>
        <p className="mt-3 text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{text}</p>
    </div>
);
