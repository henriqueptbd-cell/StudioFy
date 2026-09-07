import axios from 'axios';
import { toast } from 'react-hot-toast';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

export const TOKEN_KEY = '@StudioFy:token';

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Normaliza os erros retornados pela API para uma mensagem amigável.
export function extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | { error?: { message?: string } }
            | undefined;
        const message =
            data?.error?.message ||
            (typeof data === 'string' ? data : undefined) ||
            'Falha inesperada. Tente novamente.';
        return message;
    }
    if (error instanceof Error) return error.message;
    return 'Ocorreu um erro inesperado.';
}

// Conveniência para chamadas com feedback automático.
export function showApiError(error: unknown) {
    toast.error(extractErrorMessage(error));
}
