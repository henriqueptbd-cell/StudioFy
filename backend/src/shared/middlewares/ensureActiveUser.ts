import { Request, Response, NextFunction } from 'express';
import { and, eq } from 'drizzle-orm';
import { withTenant } from '../../db/client.js';
import { users } from '../../db/schema.js';
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

  withTenant(tenantId, (tx) =>
    tx
      .select({ active: users.active })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1),
  )
    .then(([user]) => {
      if (!user || !user.active) {
        throw new AppError('Usuário inativo no sistema.', 403, 'USER_INACTIVE');
      }

      next();
    })
    .catch(next);
}
