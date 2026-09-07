import { Router } from 'express';
import { ProvisionTenantController } from '../modules/tenants/useCases/provisionTenant/ProvisionTenantController.js';
import { LoginController } from '../modules/auth/useCases/login/LoginController.js';
import { publicRateLimiter } from '../shared/middlewares/rateLimiter.js';

const authRoutes = Router();
const provisionTenantController = new ProvisionTenantController();
const loginController = new LoginController();

authRoutes.post('/api/v1/public/tenants/provision', publicRateLimiter, (req, res, next) => {
    provisionTenantController.handle(req, res).catch(next);
});

authRoutes.post('/api/v1/auth/login', publicRateLimiter, (req, res, next) => {
    loginController.handle(req, res).catch(next);
});

export { authRoutes };
