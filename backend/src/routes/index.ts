import { Router } from 'express';
import { ProvisionTenantController } from '../modules/tenants/useCases/provisionTenant/ProvisionTenantController.js';
import { LoginController } from '../modules/auth/useCases/login/LoginController.js';
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated.js';
import { setTenantContext } from '../shared/middlewares/setTenantContext.js';
import { authorizeRole } from '../shared/middlewares/authorizeRole.js';
import { publicRateLimiter } from '../shared/middlewares/rateLimiter.js';

const routes = Router();
const provisionTenantController = new ProvisionTenantController();
const loginController = new LoginController();

// 1. Rotas Públicas
routes.post(
    '/api/v1/public/tenants/provision',
    publicRateLimiter,
    (req, res, next) => {
        provisionTenantController.handle(req, res).catch(next);
    }
);

routes.post(
    '/api/v1/auth/login',
    publicRateLimiter,
    (req, res, next) => {
        loginController.handle(req, res).catch(next);
    }
);

// 2. Rotas Protegidas (Exemplo com Autenticação + Injeção de RLS + RBAC)
routes.get(
    '/api/v1/admin/dashboard',
    ensureAuthenticated,
    setTenantContext,
    authorizeRole(['ADMIN']),
    (req, res) => {
        return res.json({
            success: true,
            message: `Acesso concedido com RLS ativo para o Admin ${req.user?.id} no Tenant ${req.user?.tenantId}`,
        });
    }
);

export { routes };