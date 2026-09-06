import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface TokenPayload {
    sub: string;        // ID do Usuário
    tenantId: string;   // ID do Tenant
    role: 'ADMIN' | 'PROFESSIONAL';
}

export class AuthProvider {
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 8);
    }

    static async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    static generateToken(payload: TokenPayload): string {
        // 💡 As opções de expiração DEVEM ficar no terceiro parâmetro do jwt.sign
        const options: SignOptions = {
            expiresIn: env.JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'],
        };

        return jwt.sign(payload, env.JWT_SECRET, options);
    }

    static verifyToken(token: string): TokenPayload {
        return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    }
}