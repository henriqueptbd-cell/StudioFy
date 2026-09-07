// ===== Domínio público (cliente) =====

export interface TenantPublicData {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    phone?: string | null;
}

export interface Service {
    id: string;
    name: string;
    description?: string | null;
    durationMinutes: number;
    price: string;
}

export type AppointmentStatus =
    | 'PENDENTE'
    | 'CONFIRMADO'
    | 'RECUSADO'
    | 'CONCLUIDO'
    | 'CANCELADO';

export interface AppointmentSuccessResponse {
    id: string;
    status: 'PENDENTE' | 'CONFIRMADO';
    startTime: string;
    endTime: string;
    expiresAt?: string | null;
}

// ===== Domínio administrativo =====

export type Role = 'ADMIN' | 'PROFESSIONAL';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    tenantId: string;
}

export interface LoginResponse {
    token: string;
    user: AuthUser;
}

/** Payload usado no cadastro de um novo estabelecimento (provision).
 *  Cria um tenant + usuário ADMIN juntos no backend. */
export interface ProvisionTenantPayload {
    tenant: {
        name: string;
        slug: string;
        phone: string;
    };
    admin: {
        name: string;
        email: string;
        password: string;
    };
}

export interface ProvisionResponse {
    token: string;
    tenant: {
        id: string;
        name: string;
        slug: string;
    };
    user: AuthUser;
}

export interface AppointmentUser {
    id: string;
    name: string;
    phone: string;
}

export interface AppointmentService {
    id: string;
    name: string;
    durationMinutes: number;
    price: string;
}

export interface AdminAppointment {
    id: string;
    status: AppointmentStatus;
    startTime: string;
    endTime: string;
    expiresAt?: string | null;
    customer: AppointmentUser;
    service: AppointmentService;
    whatsappLink?: string;
}

export type CreateServicePayload = {
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
};

// ===== Payloads de criação =====

export interface CreateAppointmentPayload {
    serviceId: string;
    startTime: string; // ISO
    customer: {
        name: string;
        phone: string;
    };
}
