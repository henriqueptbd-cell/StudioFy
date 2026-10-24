import { Request, Response } from 'express';
import { z } from 'zod';
import { and, eq, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { withTenant } from '../../../../db/client.js';
import { appointments, customers, services, users } from '../../../../db/schema.js';

const professionals = alias(users, 'professionals');
import { AppError } from '../../../../shared/errors/AppError.js';

const listQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['PENDENTE', 'CONFIRMADO', 'RECUSADO', 'CONCLUIDO', 'CANCELADO']).optional(),
    professionalId: z.string().uuid('Profissional inválido').optional(),
});

export class ListAppointmentsController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;

        if (!tenantId) {
            throw new AppError('Contexto de tenant ausente', 400, 'MISSING_TENANT');
        }

        const { startDate, endDate, status, professionalId } = listQuerySchema.parse(request.query);

        const conditions = [eq(appointments.tenantId, tenantId)];

        if (startDate) {
            conditions.push(gte(appointments.startTime, new Date(startDate)));
        }

        if (endDate) {
            conditions.push(lte(appointments.endTime, new Date(endDate)));
        }

        if (status) {
            conditions.push(eq(appointments.status, status));
        }

        if (professionalId) {
            conditions.push(eq(appointments.professionalId, professionalId));
        }

        const list = await withTenant(tenantId, (tx) =>
            tx
                .select({
                    id: appointments.id,
                    status: appointments.status,
                    startTime: appointments.startTime,
                    endTime: appointments.endTime,
                    expiresAt: appointments.expiresAt,
                    customer: {
                        id: customers.id,
                        name: customers.name,
                        phone: customers.phone,
                    },
                    service: {
                        id: services.id,
                        name: services.name,
                        durationMinutes: services.durationMinutes,
                        price: services.price,
                    },
                    professional: {
                        id: professionals.id,
                        name: professionals.name,
                    },
                })
                .from(appointments)
                .innerJoin(customers, eq(appointments.customerId, customers.id))
                .innerJoin(services, eq(appointments.serviceId, services.id))
                .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
                .where(and(...conditions)),
        );

        // Formatar links do WhatsApp para cada agendamento
        const formattedList = list.map((item) => {
            const cleanPhone = item.customer.phone.replace(/\D/g, '');
            const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
            const message = encodeURIComponent(
                `Olá ${item.customer.name}! Seu agendamento para ${item.service.name} está com status: ${item.status}.`
            );

            return {
                ...item,
                whatsappLink: `https://wa.me/${fullPhone}?text=${message}`,
            };
        });

        return response.json({
            success: true,
            data: formattedList,
        });
    }
}
