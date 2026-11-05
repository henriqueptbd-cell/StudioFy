import { Request, Response, NextFunction } from 'express';
import { and, eq } from 'drizzle-orm';
import { withTenant } from '../../db/client.js';
import { tenants, users } from '../../db/schema.js';
import { AppError } from '../errors/AppError.js';

/**
 * Garante que o usuário do JWT ainda existe e está ativo no tenant.
 * Sem essa verificação, um usuário desativado continuaria acessando o painel
 * até o token expirar.
 */
export function ensureActiveUser(request: Request, _response: Response, next: NextFunction): void {
  const userId = request.user?.id;
  const tenantId = request.user?.tenantId;

  if (!userId || !tenantId) {
    throw new AppError('Usuário não autenticado.', 401, 'UNAUTHORIZED');
  }

  withTenant(tenantId, async (tx) => {
    const [tenant] = await tx
      .select({ status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant || tenant.status !== 'ACTIVE') return { active: false };
    const [user] = await tx
      .select({ active: users.active })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);
    return { active: Boolean(user?.active) };
  })
    .then(({ active }) => {
      if (!active) {
        throw new AppError('Usuário inativo no sistema.', 403, 'USER_INACTIVE');
      }

      next();
    })
    .catch(next);
}
