import { Request, Response } from 'express';
import { z } from 'zod';
import { withTenant } from '../../../../db/client.js';
import { services } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

const createServiceSchema = z.object({
    name: z.string().min(2, 'Nome do serviço é obrigatório'),
    description: z.string().optional(),
    durationMinutes: z.number().int().positive('A duração deve ser em minutos positivos'),
    price: z.number().positive('O preço deve ser um valor positivo'),
});

export class CreateServiceController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;

        if (!tenantId || typeof tenantId !== 'string') {
            throw new AppError('Contexto do tenant não informado ou inválido', 400, 'MISSING_TENANT');
        }

        const { name, description, durationMinutes, price } = createServiceSchema.parse(request.body);

        const [newService] = await withTenant(tenantId, (tx) =>
            tx
                .insert(services)
                .values({
                    tenantId,
                    name,
                    description,
                    durationMinutes,
                    price: price.toFixed(2),
                    active: true,
                })
                .returning(),
        );

        if (!newService) {
            throw new AppError('Falha ao cadastrar o serviço', 500, 'SERVICE_CREATION_FAILED');
        }

        return response.status(201).json({
            success: true,
            data: newService,
        });
    }
}