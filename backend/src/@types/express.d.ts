import 'express';

declare global {
    namespace Express {
        export interface Request {
            user?: {
                id: string;
                tenantId: string;
                role: 'ADMIN' | 'PROFESSIONAL';
            };
        }
    }
}