import { Request, Response, NextFunction } from 'express';
import { withTenant } from '../../db/client.js';
import { AppError } from '../errors/AppError.js';

export async function setTenantContext(
    request: Request,
    _response: Response,
    next: NextFunction
): Promise<void> {
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Contexto de tenant não encontrado na requisição.', 403, 'MISSING_TENANT_CONTEXT');
    }

    try {
        // Executa a requisição encapsulando o contexto de tenant no Postgres via RLS
        await withTenant(tenantId, async () => {
            next();
        });
    } catch (error) {
        next(error);
    }
}