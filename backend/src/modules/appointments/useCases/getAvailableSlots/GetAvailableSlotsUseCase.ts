import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db, withTenant } from '../../../../db/client.js';
import { tenants, services, scheduleConfigs, appointments } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

interface IRequest {
    slug: string;
    dateStr: string; // Formato YYYY-MM-DD
    serviceId: string;
}

export class GetAvailableSlotsUseCase {
    async execute({ slug, dateStr, serviceId }: IRequest): Promise<string[]> {
        // 1. Validar e buscar o Tenant pelo slug
        const [tenant] = await db
            .select({ id: tenants.id, timezone: tenants.timezone })
            .from(tenants)
            .where(eq(tenants.slug, slug));

        if (!tenant) {
            throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
        }

        // 2. Buscar o serviço e sua duração
        const [service] = await withTenant(tenant.id, (tx) =>
            tx
                .select({ id: services.id, durationMinutes: services.durationMinutes, active: services.active })
                .from(services)
                .where(and(eq(services.id, serviceId), eq(services.tenantId, tenant.id))),
        );

        if (!service || !service.active) {
            throw new AppError('Serviço não encontrado ou inativo', 404, 'SERVICE_NOT_FOUND');
        }

        // 3. Validar a janela de 30 dias futuros e antecedência
        const requestedDate = new Date(`${dateStr}T00:00:00.000Z`);
        const now = new Date();
        const maxDate = new Date();
        maxDate.setDate(now.getDate() + 30);

        if (isNaN(requestedDate.getTime())) {
            throw new AppError('Data inválida. Use o formato YYYY-MM-DD', 400, 'INVALID_DATE');
        }

        if (requestedDate > maxDate) {
            throw new AppError('Agendamentos são permitidos apenas para os próximos 30 dias', 400, 'DATE_OUT_OF_RANGE');
        }

        // 4. Buscar configuração de horário do dia da semana (0=Dom, 6=Sáb)
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

        // 5. Montar início e fim do dia em UTC para buscar os agendamentos existentes
        const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

        const existingAppointments = await withTenant(tenant.id, (tx) =>
            tx
                .select({ startTime: appointments.startTime, endTime: appointments.endTime })
                .from(appointments)
                .where(
                    and(
                        eq(appointments.tenantId, tenant.id),
                        inArray(appointments.status, ['PENDENTE', 'CONFIRMADO']),
                        gte(appointments.startTime, dayStart),
                        lte(appointments.endTime, dayEnd),
                    ),
                ),
        );

        // 6. Gerar os slots a cada 30 minutos dentro de openTime e closeTime
        const slots: string[] = [];
        const [openHours, openMinutes] = schedule.openTime.split(':').map(Number);
        const [closeHours, closeMinutes] = schedule.closeTime.split(':').map(Number);

        const slotStart = new Date(`${dateStr}T${String(openHours).padStart(2, '0')}:${String(openMinutes).padStart(2, '0')}:00.000Z`);
        const dayCloseTime = new Date(`${dateStr}T${String(closeHours).padStart(2, '0')}:${String(closeMinutes).padStart(2, '0')}:00.000Z`);

        const minAllowedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 horas de antecedência

        while (slotStart < dayCloseTime) {
            const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60 * 1000);

            // O serviço completo deve terminar antes ou até o horário de fechamento
            if (slotEnd <= dayCloseTime) {
                // Verificar antecedência mínima de 2h
                if (slotStart >= minAllowedTime) {
                    // Verificar sobreposição com agendamentos PENDENTES ou CONFIRMADOS
                    const hasConflict = existingAppointments.some((appt) => {
                        const apptStart = new Date(appt.startTime);
                        const apptEnd = new Date(appt.endTime);
                        return slotStart < apptEnd && slotEnd > apptStart;
                    });

                    if (!hasConflict) {
                        const timeFormatted = slotStart.toISOString().substring(11, 16); // "HH:MM"
                        slots.push(timeFormatted);
                    }
                }
            }

            // Avança de 30 em 30 minutos para a próxima opção
            slotStart.setMinutes(slotStart.getMinutes() + 30);
        }

        return slots;
    }
}