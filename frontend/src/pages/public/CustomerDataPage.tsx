import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBooking } from '@/contexts/BookingContext';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { BookingSteps } from '@/components/public/BookingSteps';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateBR } from '@/utils/format';
import { createPublicAppointment } from '@/services/appointments';

export const CustomerDataPage: React.FC = () => {
  const { tenant, slug, service, date, time, customer, setCustomer, setConfirmation } =
    useBooking();
  const navigate = useNavigate();

  const [digitPhone, setDigitPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  // Prevê saída caso os dados essenciais não estejam completos.
  useEffect(() => {
    if (!service || !time) {
      navigate(`/${slug}/agendar/servicos`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tenant || !service || !date || !time) return null;

  const summaryRows = [
    { label: 'Serviço', value: service.name },
    {
      label: 'Duração',
      value: `${service.durationMinutes} min`,
    },
    { label: 'Preço', value: formatCurrency(service.price) },
    {
      label: 'Data e hora',
      value: `${formatDateBR(date)} às ${time}`,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!digitPhone.length || digitPhone.length < 10) {
      setErrorField('Informe um telefone com DDD válido.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorField(null);

      // Monta o horário local em Date e converte para ISO (UTC).
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = time.split(':').map(Number);
      const local = new Date(y, m - 1, d, hh, mm, 0, 0);
      const startTimeIso = local.toISOString();

      await createPublicAppointment(slug, {
        serviceId: service!.id,
        startTime: startTimeIso,
        customer: {
          name: customer.name,
          phone: digitPhone,
        },
      });

      setConfirmation({
        serviceName: service!.name,
        dateTimeLabel: `${formatDateBR(date)} às ${time}`,
        customerName: customer.name,
        tenantPhone: tenant.phone,
        status: 'PENDENTE',
        serviceId: service!.id,
      });

      navigate(`/${slug}/agendar/confirmacao`, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      toast.error(msg || 'Falha ao solicitar o agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-[520px] px-5 py-6">
        <PublicHeader tenant={tenant} />

        <div className="mt-7">
          <BookingSteps
            steps={['Serviço', 'Horário', 'Dados', 'Confirmar']}
            activeIndex={2}
            tenantColor={tenant.primaryColor}
          />
          <h2 className="text-2xl font-bold tracking-tight text-zinc-950">Seus dados</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Sem cadastro. Apenas para a confirmação do horário.
          </p>
        </div>

        <div className="mt-5 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
          {summaryRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{row.label}</span>
              <strong className="text-xs text-zinc-900">{row.value}</strong>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Input
            label="Nome completo"
            required
            placeholder="Como podemos te chamar?"
            value={customer.name}
            leftIcon={<UserRound className="size-4" />}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
          <PhoneInput
            value={customer.phone}
            onChange={(masked, digits) => {
              setDigitPhone(digits);
              setCustomer({ ...customer, phone: masked });
            }}
            error={errorField || undefined}
          />

          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              to={`/${slug}/agendar/horario`}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-700"
            >
              <ArrowLeft className="size-4" /> Voltar
            </Link>
            <Button type="submit" disabled={submitting || !customer.name.trim()}>
              <Check className="size-4" />
              {submitting ? 'Solicitando...' : 'Confirmar agendamento'}
            </Button>
          </div>
        </form>

        <PublicFooter />
      </div>
    </div>
  );
};
