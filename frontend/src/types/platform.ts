export type PlatformTenantStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type RestorableTenantStatus = Exclude<PlatformTenantStatus, 'ARCHIVED'>;

export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
}

export interface PlatformLoginResponse {
  token: string;
  admin: PlatformAdmin;
}

export interface TenantAppointmentMetrics {
  total: number | null;
  pending: number | null;
  confirmed: number | null;
  rejected: number | null;
  cancelled: number | null;
  completed: number | null;
}

export interface PlatformTenantMetrics {
  customerCount: number | null;
  activeServiceCount: number | null;
  activeProfessionalCount: number | null;
  appointments: TenantAppointmentMetrics;
}

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  status: PlatformTenantStatus;
  createdAt: string;
  pausedAt: string | null;
  archivedAt: string | null;
  metrics: PlatformTenantMetrics;
}

export interface TenantPage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PlatformTenantList {
  items: PlatformTenant[];
  pagination: TenantPage;
}

export interface TenantProfilePayload {
  name?: string;
  phone?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  reason: string;
}

export interface TenantAuditEntry {
  id: string;
  action: string;
  reason: string;
  metadata: unknown;
  createdAt: string;
  adminName: string;
}
