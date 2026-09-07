import { Request, Response } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { withTenant } from '../../../db/client.js';
import { appointments } from '../../../db/schema.js';
import { AppError } from '../../../shared/errors/AppError.js';

const updateStatusSchema = z.object({
    status: z.enum(['CONFIRMADO', 'RECUSADO', 'CONCLUIDO', 'CANCELADO']),
});

export class UpdateAppointmentStatusController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;
        const { id } = request.params;
        const { status: newStatus } = updateStatusSchema.parse(request.body);

        if (!tenantId) {
            throw new AppError('Contexto de tenant ausente', 400, 'MISSING_TENANT');
        }

        const updated = await withTenant(tenantId, async (tx) => {
            const [current] = await tx
                .select({ id: appointments.id, status: appointments.status })
                .from(appointments)
                .where(and(eq(appointments.id, String(id)), eq(appointments.tenantId, tenantId)));

            if (!current) {
                throw new AppError('Agendamento não encontrado', 404, 'APPOINTMENT_NOT_FOUND');
            }

            const validTransitions: Record<string, string[]> = {
                PENDENTE: ['CONFIRMADO', 'RECUSADO', 'CANCELADO'],
                CONFIRMADO: ['CONCLUIDO', 'CANCELADO'],
            };

            if (!validTransitions[current.status]?.includes(newStatus)) {
                throw new AppError(
                    `Transição inválida de ${current.status} para ${newStatus}`,
                    400,
                    'INVALID_STATUS_TRANSITION',
                );
            }

            const [result] = await tx
                .update(appointments)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(appointments.id, current.id))
                .returning();

            return result;
        });

        if (!updated) {
            throw new AppError('Falha ao atualizar o agendamento', 500, 'APPOINTMENT_UPDATE_FAILED');
        }

        return response.json({
            success: true,
            data: updated,
        });
    }
}