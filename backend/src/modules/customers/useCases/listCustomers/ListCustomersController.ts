import { Request, Response } from 'express';
import { z } from 'zod';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { customers } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';

const listQuerySchema = z.object({
    search: z.string().trim().max(100, 'Busca muito longa').optional(),
});

export class ListCustomersController {
    async handle(request: Request, response: Response): Promise<Response> {
        const tenantId = request.user?.tenantId;

        if (!tenantId || typeof tenantId !== 'string') {
            throw new AppError('Contexto do tenant não informado ou inválido', 400, 'MISSING_TENANT');
        }

        const { search } = listQuerySchema.parse(request.query);
        const conditions = [eq(customers.tenantId, tenantId)];

        if (search) {
            const digits = search.replace(/\D/g, '');
            const nameMatch = ilike(customers.name, `%${search}%`);
            const phoneMatch = digits ? ilike(customers.phone, `%${digits}%`) : undefined;
            conditions.push(phoneMatch ? or(nameMatch, phoneMatch)! : nameMatch);
        }

        // Um mesmo telefone pode ter mais de um registro de cliente (nomes
        // diferentes). A consulta mantém apenas o registro mais recente por
        // telefone para não duplicar contatos na agenda.
        const list = await withTenant(tenantId, (tx) =>
            tx
                .selectDistinctOn([customers.phone], {
                    id: customers.id,
                    name: customers.name,
                    phone: customers.phone,
                    createdAt: customers.createdAt,
                })
                .from(customers)
                .where(and(...conditions))
                .orderBy(customers.phone, desc(customers.createdAt)),
        );

        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        return response.json({
            success: true,
            data: sorted,
        });
    }
}
