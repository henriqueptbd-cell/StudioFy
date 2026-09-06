import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
    error: Error,
    _request: Request,
    response: Response,
    next: NextFunction
) {
    void next;
    // Erros conhecidos de regra de negócio (AppError)
    if (error instanceof AppError) {
        return response.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });
    }

    // Erros de Validação do Zod
    if (error instanceof ZodError) {
        return response.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Dados de entrada inválidos.',
                details: error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            },
        });
    }

    // Erros Não Tratados (500)
    console.error('CRITICAL UNHANDLED ERROR:', error);
    return response.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Ocorreu um erro interno inesperado no servidor.',
        },
    });
}