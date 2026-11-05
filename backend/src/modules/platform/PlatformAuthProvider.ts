import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

const PLATFORM_ISSUER = 'studiofy-platform';
const PLATFORM_AUDIENCE = 'studiofy-platform-console';

export interface PlatformTokenPayload {
  sub: string;
  scope: 'platform';
}

function platformSecret(): string {
  const secret = env.PLATFORM_JWT_SECRET;
  if (!secret || secret === env.JWT_SECRET) {
    throw new AppError(
      'A autenticação da plataforma não está configurada com um segredo independente.',
      503,
      'PLATFORM_AUTH_NOT_CONFIGURED',
    );
  }
  return secret;
}

export class PlatformAuthProvider {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(adminId: string): string {
    const options: SignOptions = {
      subject: adminId,
      issuer: PLATFORM_ISSUER,
      audience: PLATFORM_AUDIENCE,
      expiresIn: env.PLATFORM_JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign({ scope: 'platform' }, platformSecret(), options);
  }

  static verifyToken(token: string): PlatformTokenPayload {
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, platformSecret(), {
        issuer: PLATFORM_ISSUER,
        audience: PLATFORM_AUDIENCE,
      });
    } catch {
      throw new AppError(
        'Token da plataforma inválido ou expirado.',
        401,
        'INVALID_PLATFORM_TOKEN',
      );
    }

    if (
      typeof decoded === 'string' ||
      decoded.scope !== 'platform' ||
      typeof decoded.sub !== 'string'
    ) {
      throw new AppError(
        'Token da plataforma inválido ou expirado.',
        401,
        'INVALID_PLATFORM_TOKEN',
      );
    }
    return { sub: decoded.sub, scope: 'platform' };
  }
}
