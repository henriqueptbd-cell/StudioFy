import { api, TOKEN_KEY } from '@/services/api';
import { LoginResponse, ProvisionResponse, ProvisionTenantPayload } from '@/types';

export async function login(
    tenantSlug: string,
    email: string,
    password: string
): Promise<LoginResponse> {
    const res = await api.post<{ data: LoginResponse }>('/auth/login', {
        tenantSlug,
        email,
        password,
    });
    const data = res.data.data;
    // Guarda token e usuário
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem('@StudioFy:user', JSON.stringify(data.user));
    return data;
}

/** Cadastra um novo estabelecimento + admin (provision) e já guarda o acesso.
 *  O endpoint retorna um token válido pronto para uso. */
export async function provisionTenant(
    payload: ProvisionTenantPayload
): Promise<ProvisionResponse> {
    const res = await api.post<{ data: ProvisionResponse }>(
        '/public/tenants/provision',
        payload
    );
    const data = res.data.data;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem('@StudioFy:user', JSON.stringify(data.user));
    return data;
}

/** Lê token e usuário persistidos. */
export function getStoredAuth(): { token: string | null; user: AuthUserJson | null } {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem('@StudioFy:user');
    try {
        return { token, user: rawUser ? JSON.parse(rawUser) : null };
    } catch {
        return { token, user: null };
    }
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('@StudioFy:user');
}

interface AuthUserJson {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'PROFESSIONAL';
    tenantId: string;
}
