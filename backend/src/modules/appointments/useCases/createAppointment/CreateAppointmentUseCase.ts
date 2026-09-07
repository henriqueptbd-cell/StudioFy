import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, withTenant } from '../../../../db/client.js';
import { tenants, services, scheduleConfigs, appointments, customers } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

interface IRequest {
    slug: string;
    serviceId: string;
    startTimeIso: string;
    customerName: string;
    customerPhone: string;
}

export class CreateAppointmentUseCase {
    async execute({ slug, serviceId, startTimeIso, customerName, customerPhone }: IRequest) {
        // 1. Validar Tenant pelo Slug
        const [tenant] = await db
            .select({ id: tenants.id })
            .from(tenants)
            .where(eq(tenants.slug, slug));

        if (!tenant) {
            throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
        }

        return await withTenant(tenant.id, async (tx) => {
            // 2. Validar Serviço
            const [service] = await tx
                .select({ id: services.id, durationMinutes: services.durationMinutes, active: services.active })
                .from(services)
                .where(and(eq(services.id, serviceId), eq(services.tenantId, tenant.id)));

            if (!service || !service.active) {
                throw new AppError('Serviço não encontrado ou inativo', 404, 'SERVICE_NOT_FOUND');
            }

            // 3. Validar antecedencia minima e janela maxima de 30 dias.
            const startTime = new Date(startTimeIso);
            const now = new Date();

            if (isNaN(startTime.getTime())) {
                throw new AppError('Data/Hora de início inválida', 400, 'INVALID_DATE');
            }

            const minAllowedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            if (startTime < minAllowedTime) {
                throw new AppError('Agendamentos devem ser feitos com no mínimo 2 horas de antecedência', 400, 'MIN_ADVANCE_TIME');
            }

            const maxAllowedTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (startTime > maxAllowedTime) {
                throw new AppError('Agendamentos são permitidos apenas para os próximos 30 dias', 400, 'DATE_OUT_OF_RANGE');
            }

            const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

            // O MVP usa o horario geral do estabelecimento como agenda unica.
            const dayOfWeek = startTime.getUTCDay();
            const [schedule] = await tx
                .select()
                .from(scheduleConfigs)
                .where(and(eq(scheduleConfigs.tenantId, tenant.id), eq(scheduleConfigs.dayOfWeek, dayOfWeek)));

            if (!schedule || schedule.isClosed) {
                throw new AppError('Estabelecimento fechado no dia selecionado', 400, 'ESTABLISHMENT_CLOSED');
            }

            const toMinutes = (value: string) => {
                const [hours, minutes] = value.split(':').map(Number);
                return hours * 60 + minutes;
            };

            const startMinutes = startTime.getUTCHours() * 60 + startTime.getUTCMinutes();
            const endMinutes = endTime.getUTCHours() * 60 + endTime.getUTCMinutes();

            if (startMinutes < toMinutes(schedule.openTime) || endMinutes > toMinutes(schedule.closeTime)) {
                throw new AppError('O horário selecionado está fora do expediente de funcionamento', 400, 'OUT_OF_BUSINESS_HOURS');
            }

            // 4. Validar Conflito com Agendamentos Existentes (PENDENTE ou CONFIRMADO)
            const conflictingAppointments = await tx
                .select({ id: appointments.id })
                .from(appointments)
                .where(
                    and(
                        eq(appointments.tenantId, tenant.id),
                        inArray(appointments.status, ['PENDENTE', 'CONFIRMADO']),
                        sql`${appointments.startTime} < ${endTime} AND ${appointments.endTime} > ${startTime}`
                    )
                );

            if (conflictingAppointments.length > 0) {
                throw new AppError('O horário selecionado não está mais disponível', 409, 'SLOT_UNAVAILABLE');
            }

            // 5. UPSERT simples do Cliente (Nome + Telefone)
            let customerId = '';
            const [existingCustomer] = await tx
                .select({ id: customers.id })
                .from(customers)
                .where(and(eq(customers.tenantId, tenant.id), eq(customers.phone, customerPhone)));

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                const [newCustomer] = await tx
                    .insert(customers)
                    .values({
                        tenantId: tenant.id,
                        name: customerName,
                        phone: customerPhone,
                    })
                    .returning();

                if (!newCustomer) {
                    throw new AppError('Não foi possível criar o cliente', 500, 'CUSTOMER_CREATION_FAILED');
                }

                customerId = newCustomer.id;
            }

            // 6. Criar o Agendamento PENDENTE com expiração de 12 horas
            const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);

            const [newAppointment] = await tx
                .insert(appointments)
                .values({
                    tenantId: tenant.id,
                    serviceId: service.id,
                    customerId,
                    startTime,
                    endTime,
                    status: 'PENDENTE',
                    expiresAt,
                })
                .returning();

            return newAppointment;
        });
    }
}