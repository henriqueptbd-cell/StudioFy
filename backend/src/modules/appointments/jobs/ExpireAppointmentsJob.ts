import { and, eq, lte, or, sql } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { appointments } from '../../../db/schema.js';

export async function expirePendingAppointments(): Promise<number> {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Busca e altera para CANCELADO se:
    // 1. O expiresAt já passou (ultrapassou 12h do envio) OU
    // 2. O horário do atendimento é em menos de 1 hora
    const result = await db
        .update(appointments)
        .set({
            status: 'CANCELADO',
            updatedAt: now,
        })
        .where(
            and(
                eq(appointments.status, 'PENDENTE'),
                or(
                    lte(appointments.expiresAt, now),
                    lte(appointments.startTime, oneHourFromNow)
                )
            )
        )
        .returning({ id: appointments.id });

    return result.length;
}