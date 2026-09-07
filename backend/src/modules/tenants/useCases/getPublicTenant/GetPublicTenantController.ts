import { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db, withTenant } from '../../../../db/client.js';
import { tenants, services } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

export class GetPublicTenantController {
    // Retorna dados públicos do tenant pelo slug
    async getTenant(request: Request, response: Response): Promise<Response> {
        const { slug } = request.params;

        if (typeof slug !== 'string') {
            throw new AppError('Slug inválido', 400, 'INVALID_SLUG');
        }

        const [tenant] = await db
            .select({
                id: tenants.id,
                name: tenants.name,
                slug: tenants.slug,
                phone: tenants.phone,
                logoUrl: tenants.logoUrl,
                primaryColor: tenants.primaryColor,
            })
            .from(tenants)
            .where(eq(tenants.slug, slug));

        if (!tenant) {
            throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
        }

        return response.json({
            success: true,
            data: tenant,
        });
    }

    // Retorna apenas serviços ATIVOS do tenant pelo slug
    async getServices(request: Request, response: Response): Promise<Response> {
        const { slug } = request.params;

        if (typeof slug !== 'string') {
            throw new AppError('Slug inválido', 400, 'INVALID_SLUG');
        }

        const [tenant] = await db
            .select({ id: tenants.id })
            .from(tenants)
            .where(eq(tenants.slug, slug));

        if (!tenant) {
            throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
        }

        const activeServices = await withTenant(tenant.id, (tx) =>
            tx
                .select({
                    id: services.id,
                    name: services.name,
                    description: services.description,
                    durationMinutes: services.durationMinutes,
                    price: services.price,
                })
                .from(services)
                .where(and(eq(services.tenantId, tenant.id), eq(services.active, true))),
        );

        return response.json({
            success: true,
            data: activeServices,
        });
    }
}