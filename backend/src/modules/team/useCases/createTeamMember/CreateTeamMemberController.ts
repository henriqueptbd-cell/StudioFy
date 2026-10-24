import { Request, Response } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { withTenant } from '../../../../db/client.js';
import { users } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { AuthProvider } from '../../../../shared/providers/AuthProvider.js';

const createTeamMemberSchema = z.object({
  name: z.string().trim().min(2, 'Nome do profissional é obrigatório'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'PROFESSIONAL']).default('PROFESSIONAL'),
});

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}

export class CreateTeamMemberController {
  async handle(request: Request, response: Response): Promise<Response> {
    const tenantId = request.user?.tenantId;

    if (!tenantId || typeof tenantId !== 'string') {
      throw new AppError('Contexto do tenant não informado ou inválido', 400, 'MISSING_TENANT');
    }

    const { name, email, password, role } = createTeamMemberSchema.parse(request.body);
    const passwordHash = await AuthProvider.hashPassword(password);

    try {
      const member = await withTenant(tenantId, async (tx) => {
        const [existing] = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), eq(users.email, email)))
          .limit(1);

        if (existing) {
          throw new AppError('Já existe um membro com este e-mail.', 409, 'EMAIL_ALREADY_EXISTS');
        }

        const [created] = await tx
          .insert(users)
          .values({
            tenantId,
            name,
            email,
            passwordHash,
            role,
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            active: users.active,
            createdAt: users.createdAt,
          });

        if (!created) {
          throw new AppError(
            'Falha ao cadastrar o membro da equipe',
            500,
            'TEAM_MEMBER_CREATION_FAILED',
          );
        }

        return created;
      });

      return response.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError('Já existe um membro com este e-mail.', 409, 'EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  }
}
