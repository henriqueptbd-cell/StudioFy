import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { getDay, getHours, getMinutes } from 'date-fns';

export const DEFAULT_TZ = 'America/Sao_Paulo';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    isoDate: formatInTimeZone(utcDate, timeZone, 'yyyy-MM-dd'),
    date: zoned,
  };
}

/** Data local atual no fuso informado, sem depender do timezone do processo. */
export function todayInTimezone(timeZone: string, now = new Date()): string {
  return formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
}

/** Valida data-calendário real no formato ISO YYYY-MM-DD. */
export function isValidIsoDate(dateStr: string): boolean {
  if (!ISO_DATE_PATTERN.test(dateStr)) return false;
  const parsed = new Date(`${dateStr}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateStr;
}

/** Soma dias a uma data YYYY-MM-DD sem depender do fuso do processo. */
export function addDaysToIsoDate(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
