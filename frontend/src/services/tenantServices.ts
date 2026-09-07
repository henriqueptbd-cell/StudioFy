import { api } from '@/services/api';
import { CreateServicePayload, Service } from '@/types';

/** Cadastra um novo serviço (requer token de ADMIN). */
export async function createSessionService(payload: CreateServicePayload): Promise<Service> {
    const res = await api.post('/admin/services', payload);
    return res.data.data;
}

export async function fetchPublicServices(slug: string): Promise<Service[]> {
    const res = await api.get(`/public/tenants/${slug}/services`);
    return res.data.data;
}
