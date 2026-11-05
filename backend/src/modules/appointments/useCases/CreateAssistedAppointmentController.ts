import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../../shared/errors/AppError.js';
import { CreateAppointmentUseCase } from './createAppointment/CreateAppointmentUseCase.js';

const createAssistedAppointmentSchema = z
  .object({
    serviceId: z.string().uuid('ID de serviço inválido'),
    startTime: z.string().datetime('Data/Hora deve estar em formato ISO (UTC)'),
    customerId: z.string().uuid('ID de cliente inválido').optional(),
    customer: z
      .object({
        name: z.string().trim().min(2, 'Nome do cliente deve ter ao menos 2 caracteres'),
        phone: z
          .string()
          .transform((value) => value.replace(/\D/g, ''))
          .refine((value) => value.length === 10 || value.length === 11, {
            message: 'Telefone deve conter DDD e ter 10 ou 11 dígitos',
          }),
      })
      .optional(),
    professionalId: z.string().uuid('ID de profissional inválido').optional(),
  })
  .strict()
  .refine((body) => Boolean(body.customerId) !== Boolean(body.customer), {
    message: 'Informe exatamente um entre customerId e customer',
    path: ['customerId'],
  });

export class CreateAssistedAppointmentController {
  async handle(request: Request, response: Response): Promise<Response> {
    const user = request.user;
    if (!user) {
      throw new AppError('Usuário não autenticado.', 401, 'UNAUTHORIZED');
    }
    const body = createAssistedAppointmentSchema.parse(request.body);
    if (user.role === 'PROFESSIONAL' && body.professionalId && body.professionalId !== user.id) {
      throw new AppError(
        'Profissionais só podem agendar para si mesmos',
        403,
        'FORBIDDEN_PROFESSIONAL_ASSIGNMENT',
      );
    }

    const appointment = await new CreateAppointmentUseCase().executeAssisted({
      tenantId: user.tenantId,
      actorId: user.id,
      actorRole: user.role,
      serviceId: body.serviceId,
      startTimeIso: body.startTime,
      customerId: body.customerId,
      customerName: body.customer?.name,
      customerPhone: body.customer?.phone,
      professionalId: body.professionalId,
    });
    return response.status(201).json({ success: true, data: appointment });
  }
}
