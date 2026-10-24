import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { users } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

export class ListTeamMembersController {
  async handle(request: Request, response: Response): Promise<Response> {
    const tenantId = request.user?.tenantId;

    if (!tenantId || typeof tenantId !== 'string') {
      throw new AppError('Contexto do tenant não informado ou inválido', 400, 'MISSING_TENANT');
    }

    const list = await withTenant(tenantId, (tx) =>
      tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          active: users.active,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.tenantId, tenantId))
        .orderBy(users.name),
    );

    return response.json({
      success: true,
      data: list,
    });
  }
}
