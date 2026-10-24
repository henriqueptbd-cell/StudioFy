import { Request, Response } from 'express';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { users } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { AuthProvider } from '../../../../shared/providers/AuthProvider.js';

const paramsSchema = z.object({
  id: z.string().uuid('ID de membro inválido'),
});

const updateTeamMemberSchema = z.object({
  name: z.string().trim().min(2, 'Nome do profissional é obrigatório').optional(),
  role: z.enum(['ADMIN', 'PROFESSIONAL']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').optional(),
});

export class UpdateTeamMemberController {
  async handle(request: Request, response: Response): Promise<Response> {
    const tenantId = request.user?.tenantId;
    const currentUserId = request.user?.id;

    if (!tenantId || typeof tenantId !== 'string' || !currentUserId) {
      throw new AppError('Contexto do tenant não informado ou inválido', 400, 'MISSING_TENANT');
    }

    const { id } = paramsSchema.parse(request.params);
    const data = updateTeamMemberSchema.parse(request.body);

    if (Object.keys(data).length === 0) {
      throw new AppError('Nenhum campo para atualizar', 400, 'EMPTY_UPDATE');
    }

    const passwordHash = data.password ? await AuthProvider.hashPassword(data.password) : undefined;

    const updated = await withTenant(tenantId, async (tx) => {
      const [target] = await tx
        .select({ id: users.id, role: users.role, active: users.active })
        .from(users)
        .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!target) {
        throw new AppError('Membro da equipe não encontrado', 404, 'TEAM_MEMBER_NOT_FOUND');
      }

      if (id === currentUserId && data.active === false) {
        throw new AppError(
          'Você não pode desativar o próprio usuário.',
          400,
          'CANNOT_DEACTIVATE_SELF',
        );
      }

      if (id === currentUserId && data.role === 'PROFESSIONAL') {
        throw new AppError(
          'Você não pode remover o próprio acesso de administrador.',
          400,
          'CANNOT_DEMOTE_SELF',
        );
      }

      const losesAdminAccess =
        target.role === 'ADMIN' &&
        target.active &&
        (data.active === false || data.role === 'PROFESSIONAL');

      if (losesAdminAccess) {
        const [countRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(
            and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'), eq(users.active, true)),
          );

        const activeAdmins = Number(countRow?.count ?? 0);

        if (activeAdmins <= 1) {
          throw new AppError(
            'O estabelecimento precisa de pelo menos um administrador ativo.',
            400,
            'LAST_ADMIN_REQUIRED',
          );
        }
      }

      const [result] = await tx
        .update(users)
        .set({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          active: users.active,
          createdAt: users.createdAt,
        });

      if (!result) {
        throw new AppError(
          'Falha ao atualizar o membro da equipe',
          500,
          'TEAM_MEMBER_UPDATE_FAILED',
        );
      }

      return result;
    });

    return response.json({
      success: true,
      data: updated,
    });
  }
}
