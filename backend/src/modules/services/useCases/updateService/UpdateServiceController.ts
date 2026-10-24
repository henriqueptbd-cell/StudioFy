import { Request, Response } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { services } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

const paramsSchema = z.object({
    id: z.string().uuid('Identificador de serviço inválido'),
});

const updateServiceSchema = z
    .object({
        name: z.string().min(2, 'Nome do serviço é obrigatório').optional(),
        description: z.string().nullable().optional(),
        durationMinutes: z.number().int().positive('A duração deve ser em minutos positivos').optional(),
        price: z.number().positive('O preço deve ser um valor positivo').optional(),
        active: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Informe ao menos um campo para atualizar',
    });

export class UpdateServiceController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;

        if (!tenantId || typeof tenantId !== 'string') {
            throw new AppError('Contexto do tenant não informado ou inválido', 400, 'MISSING_TENANT');
        }

        const { id } = paramsSchema.parse(request.params);
        const data = updateServiceSchema.parse(request.body);

        const [updated] = await withTenant(tenantId, (tx) =>
            tx
                .update(services)
                .set({
                    ...(data.name !== undefined ? { name: data.name } : {}),
                    ...(data.description !== undefined ? { description: data.description } : {}),
                    ...(data.durationMinutes !== undefined
                        ? { durationMinutes: data.durationMinutes }
                        : {}),
                    ...(data.price !== undefined ? { price: data.price.toFixed(2) } : {}),
                    ...(data.active !== undefined ? { active: data.active } : {}),
                })
                .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
                .returning(),
        );

        if (!updated) {
            throw new AppError('Serviço não encontrado', 404, 'SERVICE_NOT_FOUND');
        }

        return response.json({
            success: true,
            data: updated,
        });
    }
}
