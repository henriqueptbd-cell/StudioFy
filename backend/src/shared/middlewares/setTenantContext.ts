import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export async function setTenantContext(
    request: Request,
    _response: Response,
    next: NextFunction
): void {
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Contexto de tenant não encontrado na requisição.', 403, 'MISSING_TENANT_CONTEXT');
    }

    // O contexto RLS deve envolver a consulta no controller/use case.
    // Abrir a transacao aqui encerraria o contexto antes da execucao assincrona da rota.
    next();
}