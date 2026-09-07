import { Router } from 'express';
import { ProvisionTenantController } from '../modules/tenants/useCases/provisionTenant/ProvisionTenantController.js';
import { LoginController } from '../modules/auth/useCases/login/LoginController.js';
import { CreateServiceController } from '../modules/services/useCases/createService/CreateServiceController.js';
import { GetPublicTenantController } from '../modules/tenants/useCases/getPublicTenant/GetPublicTenantController.js';
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated.js';
import { setTenantContext } from '../shared/middlewares/setTenantContext.js';
import { authorizeRole } from '../shared/middlewares/authorizeRole.js';
import { publicRateLimiter } from '../shared/middlewares/rateLimiter.js';
import { GetAvailableSlotsController } from '../modules/appointments/useCases/getAvailableSlots/GetAvailableSlotsController.js';
import { CreateAppointmentController } from '../modules/appointments/useCases/CreateAppointmentController.js';
import { UpdateAppointmentStatusController } from '../modules/appointments/useCases/UpdateAppointmentStatusController.js';

const routes = Router();

const provisionTenantController = new ProvisionTenantController();
const loginController = new LoginController();
const createServiceController = new CreateServiceController();
const getPublicTenantController = new GetPublicTenantController();
const getAvailableSlotsController = new GetAvailableSlotsController();
const createAppointmentController = new CreateAppointmentController();
const updateAppointmentStatusController = new UpdateAppointmentStatusController();

// 🟢 Rotas Públicas
routes.post('/api/v1/public/tenants/provision', publicRateLimiter, (req, res, next) => {
    provisionTenantController.handle(req, res).catch(next);
});

routes.post('/api/v1/auth/login', publicRateLimiter, (req, res, next) => {
    loginController.handle(req, res).catch(next);
});

// 🟢 Rota Pública - Criar Agendamento
routes.post('/api/v1/public/tenants/:slug/appointments', publicRateLimiter, (req, res, next) => {
    createAppointmentController.handle(req, res).catch(next);
});

// Dados públicos do estabelecimento e seus serviços ativos
routes.get('/api/v1/public/tenants/:slug', publicRateLimiter, (req, res, next) => {
    getPublicTenantController.getTenant(req, res).catch(next);
});

routes.get('/api/v1/public/tenants/:slug/services', publicRateLimiter, (req, res, next) => {
    getPublicTenantController.getServices(req, res).catch(next);
});

// Consulta de slots públicos
routes.get('/api/v1/public/tenants/:slug/slots', publicRateLimiter, (req, res, next) => {
    getAvailableSlotsController.handle(req, res).catch(next);
});

// 🟠 Rotas Autenticadas (Admin/Profissional)
routes.use('/api/v1/admin', ensureAuthenticated, setTenantContext);

// Rota de teste mantida para a suite da Fase 4
routes.get('/api/v1/admin/dashboard', authorizeRole(['ADMIN']), (req, res) => {
    return res.json({
        success: true,
        message: `Acesso concedido com RLS ativo para o Admin ${req.user?.id} no Tenant ${req.user?.tenantId}`,
    });
});

routes.post('/api/v1/admin/services', authorizeRole(['ADMIN']), (req, res, next) => {
    createServiceController.handle(req, res).catch(next);
});

// 🟠 Rota Autenticada Admin - Transições de Status
routes.patch('/api/v1/admin/appointments/:id/status', authorizeRole(['ADMIN']), (req, res, next) => {
    updateAppointmentStatusController.handle(req, res).catch(next);
});

export { routes };