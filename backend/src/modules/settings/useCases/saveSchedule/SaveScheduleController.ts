import { Request, Response } from 'express';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { scheduleConfigs } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const daySchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string().regex(timeRegex, 'Hora de abertura inválida'),
    closeTime: z.string().regex(timeRegex, 'Hora de fechamento inválida'),
    isClosed: z.boolean(),
});

const saveScheduleSchema = z.object({
    days: z.array(daySchema).length(7, 'Envie a configuração de todos os 7 dias'),
});

export class SaveScheduleController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;

        if (!tenantId || typeof tenantId !== 'string') {
            throw new AppError('Contexto do tenant não informado', 400, 'MISSING_TENANT');
        }

        const { days } = saveScheduleSchema.parse(request.body);

        // Valida ordem lógica open < close quando o dia está aberto
        for (const day of days) {
            if (day.isClosed) continue;
            if (day.closeTime <= day.openTime) {
                throw new AppError(
                    'O horário de fechamento deve ser após o de abertura.',
                    400,
                    'INVALID_TIME_RANGE',
                );
            }
        }

        const saved = await withTenant(tenantId, async (tx) => {
            const dayIds = await tx
                .select({ id: scheduleConfigs.id })
                .from(scheduleConfigs)
                .where(eq(scheduleConfigs.tenantId, tenantId));

            if (dayIds.length > 0) {
                await tx.delete(scheduleConfigs).where(
                    inArray(
                        scheduleConfigs.id,
                        dayIds.map((d) => d.id),
                    ),
                );
            }

            return tx
                .insert(scheduleConfigs)
                .values(
                    days.map((day) => ({
                        tenantId,
                        dayOfWeek: day.dayOfWeek,
                        openTime: day.openTime,
                        closeTime: day.closeTime,
                        isClosed: day.isClosed,
                    })),
                )
                .returning({
                    dayOfWeek: scheduleConfigs.dayOfWeek,
                    openTime: scheduleConfigs.openTime,
                    closeTime: scheduleConfigs.closeTime,
                    isClosed: scheduleConfigs.isClosed,
                });
        });

        return response.json({
            success: true,
            data: saved,
        });
    }
}
