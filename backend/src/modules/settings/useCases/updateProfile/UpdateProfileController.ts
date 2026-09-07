import { Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { tenants } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

const updateProfileSchema = z.object({
    name: z.string().min(2, 'Informe o nome do estabelecimento').optional(),
    phone: z.string().min(8, 'Informe um telefone válido').optional(),
    logoUrl: z.string().url('Logo URL inválida').nullable().optional(),
    primaryColor: z
        .string()
        .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Cor inválida')
        .optional(),
});

export class UpdateProfileController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;

        if (!tenantId || typeof tenantId !== 'string') {
            throw new AppError('Contexto do tenant não informado', 400, 'MISSING_TENANT');
        }

        const data = updateProfileSchema.parse(request.body);

        if (Object.keys(data).length === 0) {
            throw new AppError('Nenhum campo para atualizar', 400, 'EMPTY_UPDATE');
        }

        const [updated] = await withTenant(tenantId, (tx) =>
            tx
                .update(tenants)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(tenants.id, tenantId))
                .returning({
                    id: tenants.id,
                    name: tenants.name,
                    slug: tenants.slug,
                    phone: tenants.phone,
                    timezone: tenants.timezone,
                    logoUrl: tenants.logoUrl,
                    primaryColor: tenants.primaryColor,
                }),
        );

        return response.json({
            success: true,
            data: updated,
        });
    }
}
