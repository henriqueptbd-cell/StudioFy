import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { services } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

export class ListServicesController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;

        if (!tenantId || typeof tenantId !== 'string') {
            throw new AppError('Contexto do tenant não informado ou inválido', 400, 'MISSING_TENANT');
        }

        const list = await withTenant(tenantId, (tx) =>
            tx
                .select({
                    id: services.id,
                    name: services.name,
                    description: services.description,
                    durationMinutes: services.durationMinutes,
                    price: services.price,
                    active: services.active,
                })
                .from(services)
                .where(eq(services.tenantId, tenantId))
                .orderBy(services.name),
        );

        return response.json({
            success: true,
            data: list,
        });
    }
}
