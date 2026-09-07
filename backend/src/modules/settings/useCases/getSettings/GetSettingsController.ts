import { Request, Response } from 'express';
import { asc, eq } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { tenants, scheduleConfigs } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

export class GetSettingsController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;

        if (!tenantId || typeof tenantId !== 'string') {
            throw new AppError('Contexto do tenant não informado', 400, 'MISSING_TENANT');
        }

        const data = await withTenant(tenantId, async (tx) => {
            const [tenant] = await tx
                .select({
                    id: tenants.id,
                    name: tenants.name,
                    slug: tenants.slug,
                    phone: tenants.phone,
                    timezone: tenants.timezone,
                    logoUrl: tenants.logoUrl,
                    primaryColor: tenants.primaryColor,
                })
                .from(tenants)
                .where(eq(tenants.id, tenantId));

            if (!tenant) {
                throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
            }

            const schedule = await tx
                .select({
                    dayOfWeek: scheduleConfigs.dayOfWeek,
                    openTime: scheduleConfigs.openTime,
                    closeTime: scheduleConfigs.closeTime,
                    isClosed: scheduleConfigs.isClosed,
                })
                .from(scheduleConfigs)
                .where(eq(scheduleConfigs.tenantId, tenantId))
                .orderBy(asc(scheduleConfigs.dayOfWeek));

            return { tenant, schedule };
        });

        return response.json({
            success: true,
            data,
        });
    }
}
