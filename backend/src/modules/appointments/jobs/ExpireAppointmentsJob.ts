import { and, eq, lte, or } from 'drizzle-orm';
import { db, withTenant } from '../../../db/client.js';
import { appointments, tenants } from '../../../db/schema.js';

export async function expirePendingAppointments(): Promise<number> {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const allTenants = await db.select({ id: tenants.id }).from(tenants);
    let totalExpired = 0;

    for (const tenant of allTenants) {
        const expired = await withTenant(tenant.id, async (tx) => {
            return tx
                .update(appointments)
                .set({ status: 'CANCELADO', updatedAt: now })
                .where(
                    and(
                        eq(appointments.tenantId, tenant.id),
                        eq(appointments.status, 'PENDENTE'),
                        or(
                            lte(appointments.expiresAt, now),
                            lte(appointments.startTime, oneHourFromNow),
                        ),
                    ),
                )
                .returning({ id: appointments.id });
        });

        totalExpired += expired.length;
    }

    return totalExpired;
}