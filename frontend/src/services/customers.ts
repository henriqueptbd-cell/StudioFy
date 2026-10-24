import { api } from '@/services/api';
import { AdminCustomer } from '@/types';

/** Lista os clientes vinculados ao tenant autenticado (deduplicados por telefone). */
export async function fetchAdminCustomers(search?: string): Promise<AdminCustomer[]> {
  const res = await api.get('/admin/customers', {
    params: search ? { search } : {},
  });
  return res.data.data;
}
