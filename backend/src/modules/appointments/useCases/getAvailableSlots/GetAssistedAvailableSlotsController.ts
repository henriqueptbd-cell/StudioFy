import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../../../shared/errors/AppError.js';
import { GetAvailableSlotsUseCase } from './GetAvailableSlotsUseCase.js';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD'),
  serviceId: z.string().uuid('ID de serviço inválido'),
});

export class GetAssistedAvailableSlotsController {
  async handle(request: Request, response: Response): Promise<Response> {
    const user = request.user;
    if (!user) {
      throw new AppError('Usuário não autenticado.', 401, 'UNAUTHORIZED');
    }
    const { date, serviceId } = querySchema.parse(request.query);
    const availableSlots = await new GetAvailableSlotsUseCase().executeAssisted({
      tenantId: user.tenantId,
      dateStr: date,
      serviceId,
    });
    return response.json({ success: true, data: { date, availableSlots } });
  }
}
