import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatoria'),
    MIGRATION_DATABASE_URL: z.string().min(1).optional(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve possuir pelo menos 32 caracteres'),
    JWT_EXPIRES_IN: z.string().default('15m'), // <--- ADICIONE APENAS ESTA LINHA
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);