import { Router } from 'express';
import { CreateAppointmentController } from '../modules/appointments/useCases/CreateAppointmentController.js';
import { GetAvailableSlotsController } from '../modules/appointments/useCases/getAvailableSlots/GetAvailableSlotsController.js';
import { GetPublicTenantController } from '../modules/tenants/useCases/getPublicTenant/GetPublicTenantController.js';
import { publicRateLimiter } from '../shared/middlewares/rateLimiter.js';

const publicRoutes = Router();
const createAppointmentController = new CreateAppointmentController();
const getPublicTenantController = new GetPublicTenantController();
const getAvailableSlotsController = new GetAvailableSlotsController();

publicRoutes.post('/api/v1/public/tenants/:slug/appointments', publicRateLimiter, (req, res, next) => {
    createAppointmentController.handle(req, res).catch(next);
});

publicRoutes.get('/api/v1/public/tenants/:slug', publicRateLimiter, (req, res, next) => {
    getPublicTenantController.getTenant(req, res).catch(next);
});

publicRoutes.get('/api/v1/public/tenants/:slug/services', publicRateLimiter, (req, res, next) => {
    getPublicTenantController.getServices(req, res).catch(next);
});

publicRoutes.get('/api/v1/public/tenants/:slug/slots', publicRateLimiter, (req, res, next) => {
    getAvailableSlotsController.handle(req, res).catch(next);
});

export { publicRoutes };
