// ===== Conversão de horário local do estabelecimento -> instante UTC =====

/** Fuso usado quando o estabelecimento não informa o seu. */
export const DEFAULT_TZ = 'America/Sao_Paulo';

/** Offset (ms) do fuso informado em relação ao UTC no instante dado. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const parts: Record<string, string> = {};
    for (const part of formatter.formatToParts(date)) {
        parts[part.type] = part.value;
    }

    // Alguns ambientes devolvem "24" para a meia-noite.
    const hour = Number(parts.hour) % 24;

    const asUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        hour,
        Number(parts.minute),
        Number(parts.second),
    );

    return asUtc - date.getTime();
}

/**
 * Converte data 'YYYY-MM-DD' + hora 'HH:mm' **no fuso do estabelecimento** para
 * o instante UTC correspondente, em ISO. Evita depender do fuso do navegador.
 */
export function zonedToUtcIso(dateStr: string, timeStr: string, timeZone: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);

    const naive = Date.UTC(y, m - 1, d, hh, mm, 0, 0);

    // O offset varia com o instante (horário de verão), então refinamos uma vez.
    const firstGuess = new Date(naive - timeZoneOffsetMs(new Date(naive), timeZone));
    const refined = new Date(naive - timeZoneOffsetMs(firstGuess, timeZone));

    return refined.toISOString();
}

/**
 * Instante ISO imediatamente anterior à meia-noite seguinte à data informada,
 * no fuso do estabelecimento. Útil para filtros "até o fim do dia".
 */
export function endOfZonedDayIso(dateStr: string, timeZone: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const nextDateStr = next.toISOString().slice(0, 10);
    return new Date(
        new Date(zonedToUtcIso(nextDateStr, '00:00', timeZone)).getTime() - 1,
    ).toISOString();
}
