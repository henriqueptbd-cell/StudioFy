import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { withTenant } from '../../../../db/client.js';
import { tenants } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import {
  addDaysToIsoDate,
  isValidIsoDate,
  todayInTimezone,
} from '../../../../shared/utils/timezone.js';

const updateSchema = z
  .object({
    publicBookingUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD')
      .refine(isValidIsoDate, 'Informe uma data-calendário válida'),
  })
  .strict();

export class UpdatePublicBookingUntilController {
  async handle(request: Request, response: Response): Promise<Response> {
    const tenantId = request.user?.tenantId;
    if (!tenantId || typeof tenantId !== 'string') {
      throw new AppError('Contexto do tenant não informado', 400, 'MISSING_TENANT');
    }
    const { publicBookingUntil } = updateSchema.parse(request.body);
    const updated = await withTenant(tenantId, async (tx) => {
      const [tenant] = await tx
        .select({ id: tenants.id, timezone: tenants.timezone })
        .from(tenants)
        .where(eq(tenants.id, tenantId));
      if (!tenant) {
        throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
      }
      const today = todayInTimezone(tenant.timezone);
      const lastAllowedDate = addDaysToIsoDate(today, 90);
      if (publicBookingUntil < today || publicBookingUntil > lastAllowedDate) {
        throw new AppError(
          'A data deve estar entre hoje e os próximos 90 dias, no fuso do estabelecimento',
          400,
          'DATE_OUT_OF_RANGE',
        );
      }
      const [result] = await tx
        .update(tenants)
        .set({ publicBookingUntil, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId))
        .returning({ publicBookingUntil: tenants.publicBookingUntil });
      if (!result) {
        throw new AppError('Não foi possível atualizar a janela pública', 500, 'UPDATE_FAILED');
      }
      return result.publicBookingUntil;
    });
    return response.json({ success: true, data: { publicBookingUntil: updated } });
  }
}
