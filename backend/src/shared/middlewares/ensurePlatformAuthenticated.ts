import { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { platformAdmins } from '../../db/schema.js';
import { AppError } from '../errors/AppError.js';
import { PlatformAuthProvider } from '../../modules/platform/PlatformAuthProvider.js';

export function ensurePlatformAuthenticated(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    next(new AppError('Token da plataforma não fornecido.', 401, 'UNAUTHORIZED'));
    return;
  }

  const [scheme, token, extra] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token || extra) {
    next(new AppError('Formato do token da plataforma inválido.', 401, 'INVALID_TOKEN_FORMAT'));
    return;
  }

  let decoded: ReturnType<typeof PlatformAuthProvider.verifyToken>;
  try {
    decoded = PlatformAuthProvider.verifyToken(token);
  } catch (error) {
    next(error);
    return;
  }

  db.select({
    id: platformAdmins.id,
    name: platformAdmins.name,
    email: platformAdmins.email,
    active: platformAdmins.active,
  })
    .from(platformAdmins)
    .where(eq(platformAdmins.id, decoded.sub))
    .limit(1)
    .then(([admin]) => {
      if (!admin || !admin.active) {
        throw new AppError('Acesso à plataforma revogado.', 403, 'PLATFORM_ADMIN_INACTIVE');
      }
      request.platformAdmin = { id: admin.id, name: admin.name, email: admin.email };
      next();
    })
    .catch(next);
}
