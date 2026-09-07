import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateAppointmentUseCase } from './createAppointment/CreateAppointmentUseCase.js';

const createAppointmentSchema = z.object({
    serviceId: z.string().uuid('ID de serviço inválido'),
    startTime: z.string().datetime('Data/Hora deve estar em formato ISO (UTC)'),
    customer: z.object({
        name: z.string().min(2, 'Nome do cliente é obrigatório'),
        phone: z
            .string()
            .transform((val) => val.replace(/\D/g, '')) // Remove caracteres não numéricos
            .refine((val) => val.length >= 10 && val.length <= 11, {
                message: 'Telefone deve conter DDD e ter 10 ou 11 dígitos',
            }),
    }),
});

export class CreateAppointmentController {
    async handle(request: Request, response: Response): Promise<Response> {
        const { slug } = request.params;
        const { serviceId, startTime, customer } = createAppointmentSchema.parse(request.body);

        const createAppointmentUseCase = new CreateAppointmentUseCase();
        const appointment = await createAppointmentUseCase.execute({
            slug: String(slug),
            serviceId,
            startTimeIso: startTime,
            customerName: customer.name,
            customerPhone: customer.phone,
        });

        return response.status(201).json({
            success: true,
            data: appointment,
        });
    }
}