import { and, eq, gt, inArray, lt } from 'drizzle-orm';
import { db, withTenant } from '../../../../db/client.js';
import { tenants, services, scheduleConfigs, appointments } from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import {
  addDaysToIsoDate,
  isValidIsoDate,
  todayInTimezone,
  zonedToUtc,
} from '../../../../shared/utils/timezone.js';

interface IPublicRequest {
  slug: string;
  dateStr: string;
  serviceId: string;
}
interface IAssistedRequest {
  tenantId: string;
  dateStr: string;
  serviceId: string;
}
interface ITenantForSlots {
  id: string;
  timezone: string;
  status: string;
  publicBookingUntil: string;
}

const SLOT_STEP_MINUTES = 30;
const MIN_ADVANCE_MINUTES = 120;
const SCHEDULE_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

/** "HH:MM" ou "HH:MM:SS" (Postgres) -> minutos desde a meia-noite. */
function toMinutes(time: string): number {
  const match = SCHEDULE_TIME_PATTERN.exec(time.trim());
  if (!match) {
    throw new AppError(`Horário de funcionamento inválido: ${time}`, 500, 'INVALID_SCHEDULE_TIME');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}
function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export class GetAvailableSlotsUseCase {
  /** Endpoint público: sempre aplica o limite atual da janela de agendamento pública. */
  async execute({ slug, dateStr, serviceId }: IPublicRequest): Promise<string[]> {
    this.validateDate(dateStr);
    const [tenant] = await db
      .select({
        id: tenants.id,
        timezone: tenants.timezone,
        status: tenants.status,
        publicBookingUntil: tenants.publicBookingUntil,
      })
      .from(tenants)
      .where(eq(tenants.slug, slug));
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
    }
    return this.findSlots(tenant, dateStr, serviceId, true);
  }

  /** Endpoint assistido: tenantId deve vir do JWT; não consulta nem aplica a janela pública. */
  async executeAssisted({ tenantId, dateStr, serviceId }: IAssistedRequest): Promise<string[]> {
    this.validateDate(dateStr);
    const [tenant] = await withTenant(tenantId, (tx) =>
      tx
        .select({
          id: tenants.id,
          timezone: tenants.timezone,
          status: tenants.status,
          publicBookingUntil: tenants.publicBookingUntil,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId)),
    );
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
    }
    return this.findSlots(tenant, dateStr, serviceId, false);
  }

  private validateDate(dateStr: string): void {
    if (!isValidIsoDate(dateStr)) {
      throw new AppError('Data inválida. Use o formato YYYY-MM-DD', 400, 'INVALID_DATE');
    }
  }

  /** A política é definida pelo método chamador, nunca por um parâmetro HTTP. */
  private async findSlots(
    tenant: ITenantForSlots,
    dateStr: string,
    serviceId: string,
    enforcePublicWindow: boolean,
  ): Promise<string[]> {
    const requestedDate = new Date(`${dateStr}T00:00:00.000Z`);
    const today = todayInTimezone(tenant.timezone);
    if (
      enforcePublicWindow &&
      (dateStr > tenant.publicBookingUntil || dateStr > addDaysToIsoDate(today, 90))
    ) {
      throw new AppError(
        'Data fora do período de agendamento público permitido',
        400,
        'DATE_OUT_OF_RANGE',
      );
    }

    const [service] = await withTenant(tenant.id, (tx) =>
      tx
        .select({
          id: services.id,
          durationMinutes: services.durationMinutes,
          active: services.active,
        })
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.tenantId, tenant.id))),
    );
    if (!service || !service.active) {
      throw new AppError('Serviço não encontrado ou inativo', 404, 'SERVICE_NOT_FOUND');
    }

    const timezone = tenant.timezone;
    const dayStart = zonedToUtc(dateStr, '00:00', timezone);
    const nextDay = addDaysToIsoDate(dateStr, 1);
    const dayEnd = zonedToUtc(nextDay, '00:00', timezone);
    const dayOfWeek = requestedDate.getUTCDay();
    const [schedule] = await withTenant(tenant.id, (tx) =>
      tx
        .select()
        .from(scheduleConfigs)
        .where(
          and(eq(scheduleConfigs.tenantId, tenant.id), eq(scheduleConfigs.dayOfWeek, dayOfWeek)),
        ),
    );
    if (!schedule || schedule.isClosed) return [];

    const openMinutes = toMinutes(schedule.openTime);
    const closeMinutes = toMinutes(schedule.closeTime);
    const existingAppointments = await withTenant(tenant.id, (tx) =>
      tx
        .select({ startTime: appointments.startTime, endTime: appointments.endTime })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenant.id),
            inArray(appointments.status, ['PENDENTE', 'CONFIRMADO']),
            lt(appointments.startTime, dayEnd),
            gt(appointments.endTime, dayStart),
          ),
        ),
    );

    const slots: string[] = [];
    const minAllowedTime = new Date(Date.now() + MIN_ADVANCE_MINUTES * 60 * 1000);
    for (
      let minutes = openMinutes;
      minutes + service.durationMinutes <= closeMinutes;
      minutes += SLOT_STEP_MINUTES
    ) {
      const label = toHHMM(minutes);
      const slotStart = zonedToUtc(dateStr, label, timezone);
      if (slotStart < minAllowedTime) continue;
      const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60 * 1000);
      const hasConflict = existingAppointments.some((appointment) => {
        const appointmentStart = new Date(appointment.startTime);
        const appointmentEnd = new Date(appointment.endTime);
        return slotStart < appointmentEnd && slotEnd > appointmentStart;
      });
      if (!hasConflict) slots.push(label);
    }
    return slots;
  }
}
