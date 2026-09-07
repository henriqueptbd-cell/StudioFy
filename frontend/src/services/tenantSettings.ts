import { api } from '@/services/api';
import {
    ScheduleDay,
    TenantSettings,
    TenantSettingsProfile,
} from '@/types';

/** Busca os dados de configuração do estabelecimento logado. */
export async function fetchTenantSettings(): Promise<TenantSettings> {
    const res = await api.get('/admin/settings');
    return res.data.data;
}

/** Atualiza o perfil do estabelecimento (nome, telefone, logo e cor). */
export async function updateTenantProfile(
    payload: Partial<Pick<TenantSettingsProfile, 'name' | 'phone' | 'logoUrl' | 'primaryColor'>>
): Promise<TenantSettingsProfile> {
    const res = await api.put('/admin/settings/profile', payload);
    return res.data.data;
}

/** Substitui a configuração de horários da semana inteira. */
export async function saveSchedule(days: ScheduleDay[]): Promise<ScheduleDay[]> {
    const res = await api.put('/admin/settings/schedule', { days });
    return res.data.data;
}
