import { describe, it, expect } from 'vitest';
import { DEFAULT_TZ, utcToZoned, zonedToUtc } from './timezone.js';

describe('Utils - Conversão de fuso do estabelecimento', () => {
    it('deve converter um horário local do estabelecimento para o instante UTC', () => {
        expect(zonedToUtc('2026-09-10', '08:00', DEFAULT_TZ).toISOString()).toBe('2026-09-10T11:00:00.000Z');
    });

    it('deve usar a meia-noite local como início do dia-calendário', () => {
        expect(zonedToUtc('2026-09-10', '00:00', DEFAULT_TZ).toISOString()).toBe('2026-09-10T03:00:00.000Z');
    });

    it('deve respeitar o offset do fuso informado (não o fuso do processo)', () => {
        // Manaus = UTC-4, então 08:00 local = 12:00Z.
        expect(zonedToUtc('2026-09-10', '08:00', 'America/Manaus').toISOString()).toBe('2026-09-10T12:00:00.000Z');
    });

    it('deve devolver os componentes de relógio local a partir de um instante UTC', () => {
        const zoned = utcToZoned(new Date('2026-09-10T11:00:00.000Z'), DEFAULT_TZ);

        expect(zoned.hour).toBe(8);
        expect(zoned.minute).toBe(0);
        expect(zoned.isoDate).toBe('2026-09-10');
        expect(zoned.dayOfWeek).toBe(4); // Quinta-feira
    });

    it('deve manter o dia-calendário correto perto da virada do dia em UTC', () => {
        // 00:30 local de 11/09 = 03:30Z de 11/09; já 23:30 local de 10/09 = 02:30Z de 11/09.
        const lateNight = utcToZoned(new Date('2026-09-11T02:30:00.000Z'), DEFAULT_TZ);
        expect(lateNight.isoDate).toBe('2026-09-10');
        expect(lateNight.dayOfWeek).toBe(4);

        const afterMidnight = utcToZoned(new Date('2026-09-11T03:30:00.000Z'), DEFAULT_TZ);
        expect(afterMidnight.isoDate).toBe('2026-09-11');
        expect(afterMidnight.dayOfWeek).toBe(5);
    });
});
