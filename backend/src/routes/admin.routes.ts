import { Router } from 'express';
import { CreateServiceController } from '../modules/services/useCases/createService/CreateServiceController.js';
import { UpdateAppointmentStatusController } from '../modules/appointments/useCases/UpdateAppointmentStatusController.js';
import { ListAppointmentsController } from '../modules/appointments/useCases/listAppointments/ListAppointmentsController.js';
import { expirePendingAppointments } from '../modules/appointments/jobs/ExpireAppointmentsJob.js';
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated.js';
import { setTenantContext } from '../shared/middlewares/setTenantContext.js';
import { authorizeRole } from '../shared/middlewares/authorizeRole.js';

const adminRoutes = Router();
const createServiceController = new CreateServiceController();
const updateAppointmentStatusController = new UpdateAppointmentStatusController();
const listAppointmentsController = new ListAppointmentsController();

adminRoutes.use('/api/v1/admin', ensureAuthenticated, setTenantContext);

adminRoutes.get('/api/v1/admin/dashboard', authorizeRole(['ADMIN']), (req, res) => {
    return res.json({
        success: true,
        message: `Acesso concedido com RLS ativo para o Admin ${req.user?.id} no Tenant ${req.user?.tenantId}`,
    });
});

adminRoutes.post('/api/v1/admin/services', authorizeRole(['ADMIN']), (req, res, next) => {
    createServiceController.handle(req, res).catch(next);
});

adminRoutes.patch('/api/v1/admin/appointments/:id/status', authorizeRole(['ADMIN']), (req, res, next) => {
    updateAppointmentStatusController.handle(req, res).catch(next);
});

adminRoutes.get('/api/v1/admin/appointments', authorizeRole(['ADMIN', 'PROFESSIONAL']), (req, res, next) => {
    listAppointmentsController.handle(req, res).catch(next);
});

adminRoutes.post('/api/v1/admin/appointments/expire', authorizeRole(['ADMIN']), async (req, res, next) => {
    try {
        const expiredCount = await expirePendingAppointments();
        return res.json({ success: true, data: { expiredCount } });
    } catch (error) {
        next(error);
    }
});

export { adminRoutes };
