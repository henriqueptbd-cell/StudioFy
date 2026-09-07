import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import { useBooking } from '@/contexts/BookingContext';
import { usePublicSlots } from '@/hooks/useTenant';
import { PublicHeader } from '@/components/public/PublicHeader';
import { DatePickerHorizontal } from '@/components/public/DatePickerHorizontal';
import { SlotGrid } from '@/components/public/SlotGrid';
import { BookingSteps } from '@/components/public/BookingSteps';
import { PublicFooter } from '@/components/public/PublicFooter';
import { todayISO } from '@/utils/format';

export const SlotSelectionPage: React.FC = () => {
    const {
        tenant,
        slug,
        service,
        date,
        time,
        setDate,
        setTime,
        setCustomer,
    } = useBooking();

    useEffect(() => {
        if (!date) setDate(todayISO());
    }, [date, setDate]);

    useEffect(() => {
        return () => {
            setTime(null);
            // Reinicia dados do cliente ao refazer a seleção.
            setCustomer({ name: '', phone: '' });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { data: slotHit, isLoading } = usePublicSlots(
        slug,
        date || todayISO(),
        service?.id || ''
    );

    if (!tenant) return null;
    if (!service) {
        return (
            <NoSelectionMessage
                tenantName={tenant.name}
                slug={slug}
                tenantColor={tenant.primaryColor}
            />
        );
    }

    const slots = slotHit?.availableSlots ?? [];

    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="mx-auto w-full max-w-[520px] px-5 py-6">
                <PublicHeader tenant={tenant} />

                <div className="mt-7">
                    <BookingSteps
                        steps={['Serviço', 'Horário', 'Dados', 'Confirmar']}
                        activeIndex={1}
                        tenantColor={tenant.primaryColor}
                    />
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-zinc-950">
                            2. Data e horário
                        </h2>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                        {service.name} · {service.durationMinutes} min
                    </p>
                </div>

                <div className="mt-4">
                    <DatePickerHorizontal
                        selectedDate={date || todayISO()}
                        tenantColor={tenant.primaryColor}
                        onSelect={(d) => {
                            setDate(d);
                            setTime(null);
                        }}
                    />
                </div>

                <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold text-zinc-600">
                        Horários disponíveis
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        <SlotGrid
                            slots={slots}
                            loading={isLoading}
                            selectedTime={time}
                            tenantColor={tenant.primaryColor}
                            onSelect={setTime}
                        />
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                    <Link
                        to={`/${slug}/agendar/servicos`}
                        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-700"
                    >
                        <ArrowLeft className="size-4" /> Voltar
                    </Link>
                    {time ? (
                        <Link
                            to={`/${slug}/agendar/dados`}
                            className="inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                            style={{
                                backgroundColor:
                                    tenant.primaryColor || 'var(--primary-color)',
                            }}
                        >
                            Continuar <ArrowRight className="size-4" />
                        </Link>
                    ) : (
                        <ArrowHint />
                    )}
                </div>

                <PublicFooter />
            </div>
        </div>
    );
};

const ArrowHint: React.FC = () => (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
        <ChevronLeft className="size-3.5" /> Selecione um horário acima
    </span>
);

const NoSelectionMessage: React.FC<{
    tenantName: string;
    slug: string;
    tenantColor?: string | null;
}> = ({ tenantName, slug, tenantColor }) => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-xs rounded-3xl border border-zinc-200 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-zinc-800">
                Nenhum serviço selecionado
            </p>
            <p className="mt-1 text-xs text-zinc-500">
                Por favor, escolha um serviço em {tenantName} para continuar.
            </p>
            <Link
                to={`/${slug}/agendar/servicos`}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white"
                style={{ backgroundColor: tenantColor || '#15803d' }}
            >
                Escolher serviço
            </Link>
        </div>
    </div>
);
