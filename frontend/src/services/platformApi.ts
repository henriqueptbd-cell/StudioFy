import axios from 'axios';
import {
  PlatformLoginResponse,
  PlatformTenant,
  PlatformTenantList,
  PlatformTenantStatus,
  RestorableTenantStatus,
  TenantAuditEntry,
  TenantProfilePayload,
} from '@/types/platform';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';
export const PLATFORM_TOKEN_KEY = '@StudioFy:platform-token';
export const PLATFORM_ADMIN_KEY = '@StudioFy:platform-admin';

/** Dedicated client: it never reads or writes the tenant token or localStorage. */
export const platformApi = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});
platformApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(PLATFORM_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});

export async function platformLogin(
  email: string,
  password: string,
): Promise<PlatformLoginResponse> {
  const response = await platformApi.post<{ success: true; data: PlatformLoginResponse }>(
    '/platform/auth/login',
    { email, password },
  );
  return response.data.data;
}

export async function fetchPlatformTenants(params: {
  page: number;
  pageSize: number;
  q?: string;
  status?: PlatformTenantStatus;
}): Promise<PlatformTenantList> {
  const response = await platformApi.get<{ success: true; data: PlatformTenantList }>(
    '/platform/tenants',
    { params },
  );
  return response.data.data;
}

export async function updatePlatformTenantProfile(
  id: string,
  payload: TenantProfilePayload,
): Promise<PlatformTenant> {
  const response = await platformApi.patch<{ success: true; data: PlatformTenant }>(
    `/platform/tenants/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data.data;
}

export async function updatePlatformTenantStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED',
  reason: string,
): Promise<PlatformTenant> {
  const action = status === 'PAUSED' ? 'pause' : 'reactivate';
  const response = await platformApi.post<{ success: true; data: PlatformTenant }>(
    `/platform/tenants/${encodeURIComponent(id)}/${action}`,
    { reason },
  );
  return response.data.data;
}

export async function archivePlatformTenant(id: string, reason: string): Promise<PlatformTenant> {
  const response = await platformApi.post<{ success: true; data: PlatformTenant }>(
    `/platform/tenants/${encodeURIComponent(id)}/archive`,
    { reason },
  );
  return response.data.data;
}

export async function restorePlatformTenant(
  id: string,
  status: RestorableTenantStatus,
  reason: string,
): Promise<PlatformTenant> {
  const response = await platformApi.post<{ success: true; data: PlatformTenant }>(
    `/platform/tenants/${encodeURIComponent(id)}/restore`,
    { status, reason },
  );
  return response.data.data;
}

export async function fetchTenantAudit(id: string, limit = 20): Promise<TenantAuditEntry[]> {
  const response = await platformApi.get<{ success: true; data: TenantAuditEntry[] }>(
    '/platform/audit-logs',
    { params: { tenantId: id, limit } },
  );
  return response.data.data;
}
