import { api } from '@/services/api';
import {
  AdminAppointment,
  AppointmentStatus,
  CreateAppointmentPayload,
  CreateAssistedAppointmentPayload,
  PublicSlotsResponse,
} from '@/types';

/** Cria um agendamento público. */
export function createPublicAppointment(slug: string, payload: CreateAppointmentPayload) {
  return api.post(`/public/tenants/${slug}/appointments`, payload);
}

/** Consulta slots na rota administrativa autenticada para agendamento assistido. */
export async function fetchAdminAvailableSlots(
  date: string,
  serviceId: string,
): Promise<PublicSlotsResponse> {
  const res = await api.get('/admin/appointments/available-slots', {
    params: { date, serviceId },
  });
  return res.data.data;
}

/** Cria um agendamento administrativo já confirmado pelo backend. */
export async function createAssistedAppointment(
  payload: CreateAssistedAppointmentPayload,
): Promise<AdminAppointment> {
  const res = await api.post('/admin/appointments', payload);
  return res.data.data;
}

/** Lista agendamentos administrativos com filtros opcionais. */
export async function listAdminAppointments(params: {
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus;
  professionalId?: string;
}): Promise<AdminAppointment[]> {
  const res = await api.get('/admin/appointments', { params });
  return res.data.data;
}

/** Altera o status de um agendamento. */
export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<{ id: string; status: AppointmentStatus }> {
  const res = await api.patch(`/admin/appointments/${id}/status`, { status });
  return res.data.data;
}
