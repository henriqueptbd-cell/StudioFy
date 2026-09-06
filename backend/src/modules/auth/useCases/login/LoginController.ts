import { Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, withTenant } from '../../../../db/client.js';
import { tenants, users } from '../../../../db/schema.js';
import { AuthProvider } from '../../../../shared/providers/AuthProvider.js';
import { AppError } from '../../../../shared/errors/AppError.js';

const loginSchema = z.object({
    tenantSlug: z.string().min(2, 'Slug do estabelecimento e obrigatorio.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(1, 'A senha é obrigatória.'),
});

export class LoginController {
    async handle(request: Request, response: Response): Promise<Response> {
        const { tenantSlug, email, password } = loginSchema.parse(request.body);

        const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug));

        if (!tenant) {
            throw new AppError('E-mail ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
        }

        // O usuario so e consultado depois que o tenant foi estabelecido no contexto RLS.
        const [user] = await withTenant(tenant.id, async (tx) =>
            tx.select().from(users).where(eq(users.email, email)),
        );

        if (!user) {
            throw new AppError('E-mail ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
        }

        if (!user.active) {
            throw new AppError('Usuário inativo no sistema.', 403, 'USER_INACTIVE');
        }

        // 2. Comparar senha com o hash seguro
        const passwordMatch = await AuthProvider.comparePassword(password, user.passwordHash);

        if (!passwordMatch) {
            throw new AppError('E-mail ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
        }

        // 3. Emitir token JWT vinculando Usuário e Tenant
        const token = AuthProvider.generateToken({
            sub: user.id,
            tenantId: user.tenantId,
            role: user.role as 'ADMIN' | 'PROFESSIONAL',
        });

        return response.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    tenantId: user.tenantId,
                },
            },
        });
    }
}