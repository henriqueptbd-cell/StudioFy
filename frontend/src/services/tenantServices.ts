import { api } from '@/services/api';
import { AdminService, CreateServicePayload, Service, UpdateServicePayload } from '@/types';

/** Cadastra um novo serviço (requer token de ADMIN). */
export async function createSessionService(payload: CreateServicePayload): Promise<Service> {
    const res = await api.post('/admin/services', payload);
    return res.data.data;
}

/** Lista os serviços do estabelecimento logado (inclui serviços inativos). */
export async function fetchAdminServices(): Promise<AdminService[]> {
    const res = await api.get('/admin/services');
    return res.data.data;
}

export async function updateSessionService(
  id: string,
  payload: UpdateServicePayload,
): Promise<Service> {
  const res = await api.patch(`/admin/services/${id}`, payload);
  return res.data.data;
}

export async function fetchPublicServices(slug: string): Promise<Service[]> {
    const res = await api.get(`/public/tenants/${slug}/services`);
    return res.data.data;
}
