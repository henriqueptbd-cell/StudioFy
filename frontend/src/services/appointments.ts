import { api } from '@/services/api';
import { AdminAppointment, AppointmentStatus, CreateAppointmentPayload } from '@/types';

/** Cria um agendamento público. */
export function createPublicAppointment(slug: string, payload: CreateAppointmentPayload) {
    return api.post(`/public/tenants/${slug}/appointments`, payload);
}

/** Lista agendamentos administrativos com filtros opcionais. */
export async function listAdminAppointments(params: {
    startDate?: string;
    endDate?: string;
    status?: AppointmentStatus;
}): Promise<AdminAppointment[]> {
    const res = await api.get('/admin/appointments', { params });
    return res.data.data;
}

/** Altera o status de um agendamento. */
export async function updateAppointmentStatus(
    id: string,
    status: AppointmentStatus
): Promise<{ id: string; status: AppointmentStatus }> {
    const res = await api.patch(`/admin/appointments/${id}/status`, { status });
    return res.data.data;
}
