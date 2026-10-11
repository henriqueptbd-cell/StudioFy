import { and, eq, gt, inArray, lt } from 'drizzle-orm';
import { db, withTenant } from '../../../../db/client.js';
import { tenants, services, scheduleConfigs, appointments } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { zonedToUtc } from '../../../../shared/utils/timezone.js';

interface IRequest {
    slug: string;
    dateStr: string; // Formato YYYY-MM-DD (dia local/calendário do estabelecimento)
    serviceId: string;
}

const SLOT_STEP_MINUTES = 30;
const MIN_ADVANCE_MINUTES = 120;
const MAX_ADVANCE_DAYS = 30;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SCHEDULE_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

/** Data-calendário (YYYY-MM-DD) em meia-noite UTC. `null` se inválida. */
function parseIsoDate(dateStr: string): Date | null {
    if (!ISO_DATE_PATTERN.test(dateStr)) return null;

    const parsed = new Date(`${dateStr}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) return null;
    if (parsed.toISOString().slice(0, 10) !== dateStr) return null;

    return parsed;
}

/** Soma dias a uma data YYYY-MM-DD sem depender do fuso do processo. */
function addDaysToIsoDate(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/** "HH:MM" ou "HH:MM:SS" (Postgres) -> minutos desde a meia-noite. */
function toMinutes(time: string): number {
    const match = SCHEDULE_TIME_PATTERN.exec(time.trim());

    if (!match) {
        throw new AppError(`Horário de funcionamento inválido: ${time}`, 500, 'INVALID_SCHEDULE_TIME');
    }

    return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutos p/ rótulo "HH:MM". */
function toHHMM(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export class GetAvailableSlotsUseCase {
    async execute({ slug, dateStr, serviceId }: IRequest): Promise<string[]> {
        // 1. Validar a data antes de qualquer conversão de fuso
        const requestedDate = parseIsoDate(dateStr);

        if (!requestedDate) {
            throw new AppError('Data inválida. Use o formato YYYY-MM-DD', 400, 'INVALID_DATE');
        }

        // 2. Buscar o Tenant pelo slug (o fuso é necessário para interpretar a data)
        const [tenant] = await db
            .select({ id: tenants.id, timezone: tenants.timezone })
            .from(tenants)
            .where(eq(tenants.slug, slug));

        if (!tenant) {
            throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
        }

        // 3. Buscar o serviço e sua duração
        const [service] = await withTenant(tenant.id, (tx) =>
            tx
                .select({ id: services.id, durationMinutes: services.durationMinutes, active: services.active })
                .from(services)
                .where(and(eq(services.id, serviceId), eq(services.tenantId, tenant.id))),
        );

        if (!service || !service.active) {
            throw new AppError('Serviço não encontrado ou inativo', 404, 'SERVICE_NOT_FOUND');
        }

        const now = new Date();
        const timezone = tenant.timezone;

        // Limites do dia-calendário LOCAL do estabelecimento, como instantes UTC.
        const dayStart = zonedToUtc(dateStr, '00:00', timezone);
        const dayEnd = zonedToUtc(addDaysToIsoDate(dateStr, 1), '00:00', timezone);

        // 4. Validar a janela de 30 dias futuros
        const maxAllowedTime = new Date(now.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000);

        if (dayStart > maxAllowedTime) {
            throw new AppError('Agendamentos são permitidos apenas para os próximos 30 dias', 400, 'DATE_OUT_OF_RANGE');
        }

        // 5. Buscar configuração de horário do dia da semana (0=Dom, 6=Sáb).
        // O dia da semana é o do dia-calendário local, independente do fuso do processo.
        const dayOfWeek = requestedDate.getUTCDay();
        const [schedule] = await withTenant(tenant.id, (tx) =>
            tx
                .select()
                .from(scheduleConfigs)
                .where(and(eq(scheduleConfigs.tenantId, tenant.id), eq(scheduleConfigs.dayOfWeek, dayOfWeek))),
        );

        if (!schedule || schedule.isClosed) {
            return []; // Estabelecimento fechado no dia selecionado
        }

        const openMinutes = toMinutes(schedule.openTime);
        const closeMinutes = toMinutes(schedule.closeTime);

        // 6. Buscar agendamentos que sobrepõem o dia local (inclui os que começam
        // antes da meia-noite e terminam depois dela).
        const existingAppointments = await withTenant(tenant.id, (tx) =>
            tx
                .select({ startTime: appointments.startTime, endTime: appointments.endTime })
                .from(appointments)
                .where(
                    and(
                        eq(appointments.tenantId, tenant.id),
                        inArray(appointments.status, ['PENDENTE', 'CONFIRMADO']),
                        lt(appointments.startTime, dayEnd),
                        gt(appointments.endTime, dayStart),
                    ),
                ),
        );

        // 7. Gerar os slots a cada 30 minutos dentro de openTime e closeTime,
        // rotulados no relógio local do estabelecimento.
        const slots: string[] = [];
        const minAllowedTime = new Date(now.getTime() + MIN_ADVANCE_MINUTES * 60 * 1000);

        for (
            let minutes = openMinutes;
            minutes + service.durationMinutes <= closeMinutes;
            minutes += SLOT_STEP_MINUTES
        ) {
            const label = toHHMM(minutes);
            const slotStart = zonedToUtc(dateStr, label, timezone);

            // Antecedência mínima de 2 horas
            if (slotStart < minAllowedTime) continue;

            const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60 * 1000);

            const hasConflict = existingAppointments.some((appt) => {
                const apptStart = new Date(appt.startTime);
                const apptEnd = new Date(appt.endTime);
                return slotStart < apptEnd && slotEnd > apptStart;
            });

            if (!hasConflict) {
                slots.push(label);
            }
        }

        return slots;
    }
}