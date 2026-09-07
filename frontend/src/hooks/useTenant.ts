import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Service, TenantPublicData } from '@/types';

export function useTenantBySlug(slug: string) {
    return useQuery<TenantPublicData>({
        queryKey: ['tenant', slug],
        queryFn: async () => {
            const res = await api.get(`/public/tenants/${slug}`);
            return res.data.data;
        },
        enabled: Boolean(slug),
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
}

export function usePublicServices(slug: string) {
    return useQuery<Service[]>({
        queryKey: ['services', slug],
        queryFn: async () => {
            const res = await api.get(`/public/tenants/${slug}/services`);
            return res.data.data;
        },
        enabled: Boolean(slug),
        staleTime: 1000 * 60 * 5,
    });
}

export interface SlotsPayload {
    date: string;
    availableSlots: string[];
}

export function usePublicSlots(
    slug: string,
    date: string,
    serviceId: string | null
) {
    return useQuery<SlotsPayload>({
        queryKey: ['slots', slug, date, serviceId],
        queryFn: async () => {
            const res = await api.get(`/public/tenants/${slug}/slots`, {
                params: { date, serviceId },
            });
            return res.data.data;
        },
        enabled: Boolean(slug) && Boolean(date) && Boolean(serviceId),
        staleTime: 1000 * 60 * 2,
    });
}
