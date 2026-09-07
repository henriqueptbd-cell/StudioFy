// ===== Formatação de moeda =====

/** Converte "1234.50" ou 1234.5 em "R$ 1.234,50". */
export function formatCurrency(value: string | number): string {
    const numeric =
        typeof value === 'string' ? Number.parseFloat(value.replace(',', '.')) : value;
    if (Number.isNaN(numeric)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(numeric);
}

// ===== Datas e horários =====

/** "2026-09-10" -> "10/09/2026" */
export function formatDateBR(iso: string): string {
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
}

/** "@format '18/09 às 14:00'". Recebe date 'YYYY-MM-DD' e time 'HH:mm'. */
export function formatDateAndTime(dateIso: string, time: string): string {
    return `${formatDateBR(dateIso)} às ${time}`;
}

/** Primeira letra maiúscula. */
export function capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ===== Telefone =====

/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
}

/** Aplica máscara "(11) 91234-5678" progressivamente. */
export function maskPhone(value: string): string {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length === 10)
        return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ===== Data ISO local =====

/** Retorna a data de hoje no fuso local como 'YYYY-MM-DD'. */
export function todayISO(): string {
    return toISODate(new Date());
}

/** Converte Date para 'YYYY-MM-DD' no fuso local (evita shift de UTC). */
export function toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Adiciona dias e retorna Date. */
export function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

/** Converte Date local em string ISO (UTC). */
export function toUTCISO(date: Date): string {
    return date.toISOString();
}

// ===== WhatsApp =====

/**
 * Gera link wa.me para conversa.
 * @param phoneTelefone completo ou com DDD. Prefixo 55 adicionado se já não houver.
 * @param text        Texto (opcional) já sem codificação.
 */
export function buildWhatsAppLink(phone: string, text?: string): string {
    let clean = onlyDigits(phone);
    if (!clean.startsWith('55')) clean = `55${clean}`;
    const query = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${clean}${query}`;
}
