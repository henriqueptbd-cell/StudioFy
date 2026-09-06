import { Request, Response, NextFunction } from 'express';
import { AuthProvider } from '../providers/AuthProvider.js';
import { AppError } from '../errors/AppError.js';

export function ensureAuthenticated(
    request: Request,
    _response: Response,
    next: NextFunction
): void {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
        throw new AppError('Token de autenticação não fornecido.', 401, 'UNAUTHORIZED');
    }

    // O formato esperado do cabeçalho é: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new AppError('Formato do token inválido.', 401, 'INVALID_TOKEN_FORMAT');
    }

    const token = parts[1];

    // 💡 VALIDAÇÃO ADICIONADA: Elimina o aviso de 'undefined' para o TypeScript
    if (!token) {
        throw new AppError('Token de autenticação ausente.', 401, 'INVALID_TOKEN');
    }

    try {
        const decoded = AuthProvider.verifyToken(token);

        // Injeta as informações do usuário autenticado e seu tenant na requisição
        request.user = {
            id: decoded.sub,
            tenantId: decoded.tenantId,
            role: decoded.role,
        };

        return next();
    } catch {
        throw new AppError('Token inválido ou expirado.', 401, 'INVALID_TOKEN');
    }
}