import { Router } from 'express';
import { CreateServiceController } from '../modules/services/useCases/createService/CreateServiceController.js';
import { ListServicesController } from '../modules/services/useCases/listServices/ListServicesController.js';
import { ListCustomersController } from '../modules/customers/useCases/listCustomers/ListCustomersController.js';
import { UpdateServiceController } from '../modules/services/useCases/updateService/UpdateServiceController.js';
import { UpdateAppointmentStatusController } from '../modules/appointments/useCases/UpdateAppointmentStatusController.js';
import { ListAppointmentsController } from '../modules/appointments/useCases/listAppointments/ListAppointmentsController.js';
import { expirePendingAppointments } from '../modules/appointments/jobs/ExpireAppointmentsJob.js';
import { GetSettingsController } from '../modules/settings/useCases/getSettings/GetSettingsController.js';
import { UpdateProfileController } from '../modules/settings/useCases/updateProfile/UpdateProfileController.js';
import { SaveScheduleController } from '../modules/settings/useCases/saveSchedule/SaveScheduleController.js';
import { CreateTeamMemberController } from '../modules/team/useCases/createTeamMember/CreateTeamMemberController.js';
import { ListTeamMembersController } from '../modules/team/useCases/listTeamMembers/ListTeamMembersController.js';
import { UpdateTeamMemberController } from '../modules/team/useCases/updateTeamMember/UpdateTeamMemberController.js';
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated.js';
import { ensureActiveUser } from '../shared/middlewares/ensureActiveUser.js';
import { setTenantContext } from '../shared/middlewares/setTenantContext.js';
import { authorizeRole } from '../shared/middlewares/authorizeRole.js';

const adminRoutes = Router();
const createServiceController = new CreateServiceController();
const listServicesController = new ListServicesController();
const updateServiceController = new UpdateServiceController();
const listCustomersController = new ListCustomersController();
const updateAppointmentStatusController = new UpdateAppointmentStatusController();
const listAppointmentsController = new ListAppointmentsController();
const getSettingsController = new GetSettingsController();
const updateProfileController = new UpdateProfileController();
const saveScheduleController = new SaveScheduleController();
const createTeamMemberController = new CreateTeamMemberController();
const listTeamMembersController = new ListTeamMembersController();
const updateTeamMemberController = new UpdateTeamMemberController();

adminRoutes.use('/api/v1/admin', ensureAuthenticated, ensureActiveUser, setTenantContext);

adminRoutes.get('/api/v1/admin/dashboard', authorizeRole(['ADMIN']), (req, res) => {
    return res.json({
        success: true,
        message: `Acesso concedido com RLS ativo para o Admin ${req.user?.id} no Tenant ${req.user?.tenantId}`,
    });
});

adminRoutes.get('/api/v1/admin/services', authorizeRole(['ADMIN', 'PROFESSIONAL']), (req, res, next) => {
    listServicesController.handle(req, res).catch(next);
});

adminRoutes.post('/api/v1/admin/services', authorizeRole(['ADMIN']), (req, res, next) => {
    createServiceController.handle(req, res).catch(next);
});

adminRoutes.patch('/api/v1/admin/services/:id', authorizeRole(['ADMIN']), (req, res, next) => {
    updateServiceController.handle(req, res).catch(next);
});

adminRoutes.get('/api/v1/admin/customers', authorizeRole(['ADMIN', 'PROFESSIONAL']), (req, res, next) => {
    listCustomersController.handle(req, res).catch(next);
});

adminRoutes.get('/api/v1/admin/settings', authorizeRole(['ADMIN', 'PROFESSIONAL']), (req, res, next) => {
    getSettingsController.handle(req, res).catch(next);
});

adminRoutes.put('/api/v1/admin/settings/profile', authorizeRole(['ADMIN']), (req, res, next) => {
    updateProfileController.handle(req, res).catch(next);
});

adminRoutes.put('/api/v1/admin/settings/schedule', authorizeRole(['ADMIN']), (req, res, next) => {
    saveScheduleController.handle(req, res).catch(next);
});

adminRoutes.get('/api/v1/admin/team', authorizeRole(['ADMIN', 'PROFESSIONAL']), (req, res, next) => {
    listTeamMembersController.handle(req, res).catch(next);
});

adminRoutes.post('/api/v1/admin/team', authorizeRole(['ADMIN']), (req, res, next) => {
    createTeamMemberController.handle(req, res).catch(next);
});

adminRoutes.patch('/api/v1/admin/team/:id', authorizeRole(['ADMIN']), (req, res, next) => {
    updateTeamMemberController.handle(req, res).catch(next);
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
