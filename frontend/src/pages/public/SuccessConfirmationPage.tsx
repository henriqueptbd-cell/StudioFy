import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Send, ArrowLeft, RotateCcw } from 'lucide-react';
import { useBooking } from '@/contexts/BookingContext';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Button } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/BrandMark';
import { buildWhatsAppLink } from '@/utils/format';

export const SuccessConfirmationPage: React.FC = () => {
    const { tenant, slug, confirmation, reset } = useBooking();
    const navigate = useNavigate();

    if (!tenant || !confirmation) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
                <p className="text-sm text-zinc-500">
                    Nenhuma solicitação de agendamento ativa.
                </p>
                <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => navigate(`/${slug}`)}
                >
                    Voltar ao início
                </Button>
            </div>
        );
    }

    const waMessage =
        `Olá! Me chamo ${confirmation.customerName}. ` +
        `Acabei de solicitar um agendamento de ${confirmation.serviceName} ` +
        `para ${confirmation.dateTimeLabel}.`;
    const waHref = buildWhatsAppLink(
        confirmation.tenantPhone || tenant.phone || '',
        waMessage
    );

    const restart = () => {
        reset();
        navigate(`/${slug}`);
    };

    return (
        <div className="flex min-h-screen flex-col bg-zinc-50">
            <div className="mx-auto flex w-full max-w-[520px] flex-col px-5 py-6">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BrandMark color={tenant.primaryColor} small />
                        <div>
                            <p className="font-semibold text-zinc-900">{tenant.name}</p>
                            <p className="text-xs text-zinc-500">
                                Seu momento começa aqui
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={restart}
                        className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-500 transition hover:bg-zinc-100"
                        aria-label="Voltar ao início"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                </header>

                <section className="my-auto mt-10 rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
                    <div
                        className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full"
                        style={{
                            backgroundColor: `${tenant.primaryColor || '#15803d'}18`,
                            color: tenant.primaryColor || 'var(--primary-color)',
                        }}
                    >
                        <Check className="size-8" />
                    </div>
                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold tracking-widest text-amber-700">
                        {confirmation.status}
                    </span>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950">
                        Agendamento solicitado!
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                        Avisaremos você assim que o estabelecimento confirmar o seu
                        horário.
                    </p>

                    <div className="mt-6 divide-y divide-zinc-100 rounded-2xl bg-zinc-50 text-left">
                        <DetailRow label="Serviço" value={confirmation.serviceName} />
                        <DetailRow label="Data e hora" value={confirmation.dateTimeLabel} />
                        <DetailRow label="Cliente" value={confirmation.customerName} />
                    </div>

                    <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-6 flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        style={{
                            backgroundColor: tenant.primaryColor || 'var(--primary-color)',
                        }}
                    >
                        <Send className="size-4" /> Enviar mensagem no WhatsApp
                    </a>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={restart}
                    >
                        <RotateCcw className="size-3.5" /> Fazer um novo agendamento
                    </Button>
                </section>

                <PublicFooter />
            </div>
        </div>
    );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-3 p-4">
        <span className="text-xs text-zinc-500">{label}</span>
        <strong className="text-xs text-zinc-900">{value}</strong>
    </div>
);
