import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export function authorizeRole(allowedRoles: Array<'ADMIN' | 'PROFESSIONAL'>) {
    return (request: Request, _response: Response, next: NextFunction): void => {
        if (!request.user) {
            throw new AppError('Usuário não autenticado.', 401, 'UNAUTHORIZED');
        }

        if (!allowedRoles.includes(request.user.role)) {
            throw new AppError(
                'Acesso negado. Permissão insuficiente para esta operação.',
                403,
                'FORBIDDEN'
            );
        }

        return next();
    };
}