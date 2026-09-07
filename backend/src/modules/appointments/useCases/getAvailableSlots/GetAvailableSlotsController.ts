import { Request, Response } from 'express';
import { GetAvailableSlotsUseCase } from './GetAvailableSlotsUseCase.js';
import { AppError } from '../../../../shared/errors/AppError.js';

export class GetAvailableSlotsController {
    async handle(request: Request, response: Response): Promise<Response> {
        const { slug } = request.params;
        const { date, serviceId } = request.query;

        if (typeof slug !== 'string') {
            throw new AppError('Slug inválido', 400, 'INVALID_SLUG');
        }

        if (typeof date !== 'string' || typeof serviceId !== 'string') {
            throw new AppError('Data (YYYY-MM-DD) e serviceId são obrigatórios', 400, 'MISSING_QUERY_PARAMS');
        }

        const getAvailableSlotsUseCase = new GetAvailableSlotsUseCase();
        const availableSlots = await getAvailableSlotsUseCase.execute({
            slug,
            dateStr: date,
            serviceId,
        });

        return response.json({
            success: true,
            data: {
                date,
                availableSlots,
            },
        });
    }
}