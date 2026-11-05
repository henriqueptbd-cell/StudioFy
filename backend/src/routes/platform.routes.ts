import { Router } from 'express';
import { PlatformController } from '../modules/platform/PlatformController.js';
import { ensurePlatformAuthenticated } from '../shared/middlewares/ensurePlatformAuthenticated.js';
import { publicRateLimiter } from '../shared/middlewares/rateLimiter.js';

const platformRoutes = Router();
const controller = new PlatformController();

platformRoutes.post('/api/v1/platform/auth/login', publicRateLimiter, (req, res, next) => {
  controller.login(req, res).catch(next);
});

platformRoutes.use('/api/v1/platform', ensurePlatformAuthenticated);
platformRoutes.get('/api/v1/platform/me', (req, res, next) => controller.me(req, res).catch(next));
platformRoutes.get('/api/v1/platform/overview', (req, res, next) =>
  controller.overview(req, res).catch(next),
);
platformRoutes.get('/api/v1/platform/tenants', (req, res, next) =>
  controller.listTenants(req, res).catch(next),
);
platformRoutes.patch('/api/v1/platform/tenants/:tenantId', (req, res, next) =>
  controller.updateTenantProfile(req, res).catch(next),
);
platformRoutes.post('/api/v1/platform/tenants/:tenantId/pause', (req, res, next) =>
  controller.pauseTenant(req, res).catch(next),
);
platformRoutes.post('/api/v1/platform/tenants/:tenantId/reactivate', (req, res, next) =>
  controller.reactivateTenant(req, res).catch(next),
);
platformRoutes.post('/api/v1/platform/tenants/:tenantId/archive', (req, res, next) =>
  controller.archiveTenant(req, res).catch(next),
);
platformRoutes.post('/api/v1/platform/tenants/:tenantId/restore', (req, res, next) =>
  controller.restoreTenant(req, res).catch(next),
);
platformRoutes.get('/api/v1/platform/audit-logs', (req, res, next) =>
  controller.listTenantAudit(req, res).catch(next),
);

export { platformRoutes };
