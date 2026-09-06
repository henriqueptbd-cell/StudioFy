import rateLimit from 'express-rate-limit';

export const publicRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    max: 100, // Limite de 100 requisições por IP por janela
    standardHeaders: true, // Retorna os cabeçalhos 'RateLimit-*' no padrão IETF
    legacyHeaders: false, // Desabilita os cabeçalhos antigos 'X-RateLimit-*'
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Muitas requisições originadas deste IP. Tente novamente em 15 minutos.',
        },
    },
});