import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, getDay, getHours, getMinutes } from 'date-fns';

export const DEFAULT_TZ = 'America/Sao_Paulo';

/** Um horário local (já em um Date que carrega "valores de componentes locais")
 *  + uma string 'YYYY-MM-DD HH:MM' no timezone informado -> instante UTC (Date real). */
export function zonedToUtc(dateStr: string, time: string, timeZone: string): Date {
    // Constroi "como se local" no timezone-alvo e converte p/ UTC real.
    const localNumeric = fromZonedTime(`${dateStr}T${time}:00`, timeZone);
    return localNumeric;
}

/** Instante UTC (Date real) + timezone -> componentes de relógio naquele fuso. */
export function utcToZoned(utcDate: Date, timeZone: string) {
    const zoned = toZonedTime(utcDate, timeZone);
    return {
        dayOfWeek: getDay(zoned), // 0 = Dom ... 6 = Sáb
        hour: getHours(zoned),
        minute: getMinutes(zoned),
        isoDate: format(zoned, 'yyyy-MM-dd'),
        date: zoned,
    };
}
