import { Request, Response } from 'express';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db/client.js';
import { tenants, users } from '../../../../db/schema.js';
import { AuthProvider } from '../../../../shared/providers/AuthProvider.js';
import { AppError } from '../../../../shared/errors/AppError.js';

const provisionSchema = z.object({
    tenant: z.object({
        name: z.string().min(2, 'Nome do estabelecimento muito curto'),
        slug: z
            .string()
            .min(2, 'Slug muito curto')
            .regex(/^[a-z0-9-]+$/, 'Slug inválido (use apenas letras minúsculas e hífen)'),
        phone: z.string().min(10, 'Telefone inválido'),
    }),
    admin: z.object({
        name: z.string().min(2, 'Nome do administrador muito curto'),
        email: z.string().email('E-mail inválido'),
        password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    }),
});

export class ProvisionTenantController {
    async handle(request: Request, response: Response): Promise<Response> {
        // 1. Validar a entrada com Zod
        const { tenant: tenantData, admin: adminData } = provisionSchema.parse(request.body);

        // 2. Verificar se o slug do Tenant já existe no banco
        const [existingTenant] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.slug, tenantData.slug));

        if (existingTenant) {
            throw new AppError('Este slug já está em uso por outro estabelecimento.', 409, 'SLUG_ALREADY_EXISTS');
        }

        // 3. Gerar o hash seguro da senha do Admin
        const passwordHash = await AuthProvider.hashPassword(adminData.password);

        // 4. Executar a criação atômica via Transação no Drizzle
        const result = await db.transaction(async (tx) => {
            const [newTenant] = await tx
                .insert(tenants)
                .values({
                    name: tenantData.name,
                    slug: tenantData.slug,
                    phone: tenantData.phone,
                })
                .returning();

            if (!newTenant) {
                throw new AppError('Falha ao criar o estabelecimento.', 500, 'TENANT_CREATION_FAILED');
            }

            await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${newTenant.id}, true)`);

            const [newAdmin] = await tx
                .insert(users)
                .values({
                    tenantId: newTenant.id,
                    name: adminData.name,
                    email: adminData.email,
                    passwordHash,
                    role: 'ADMIN',
                })
                .returning();

            // 💡 Validação do newAdmin: garante que result.admin nunca será undefined fora da transação
            if (!newAdmin) {
                throw new AppError('Falha ao criar o administrador do estabelecimento.', 500, 'ADMIN_CREATION_FAILED');
            }

            return { tenant: newTenant, admin: newAdmin };
        });

        // 5. Emitir o Token JWT de acesso inicial (Agora 100% tipado e seguro)
        const token = AuthProvider.generateToken({
            sub: result.admin.id,
            tenantId: result.tenant.id,
            role: 'ADMIN',
        });

        // 6. Retornar a resposta padronizada
        return response.status(201).json({
            success: true,
            data: {
                token,
                tenant: {
                    id: result.tenant.id,
                    name: result.tenant.name,
                    slug: result.tenant.slug,
                },
                user: {
                    id: result.admin.id,
                    name: result.admin.name,
                    email: result.admin.email,
                    role: result.admin.role,
                },
            },
        });
    }
}