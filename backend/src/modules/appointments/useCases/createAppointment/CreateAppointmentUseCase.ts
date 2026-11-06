import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, withTenant } from '../../../../db/client.js';
import {
  tenants,
  services,
  scheduleConfigs,
  appointments,
  customers,
  users,
} from '../../../../db/schema.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import {
  addDaysToIsoDate,
  todayInTimezone,
  utcToZoned,
  zonedToUtc,
} from '../../../../shared/utils/timezone.js';

interface IPublicRequest {
  slug: string;
  serviceId: string;
  startTimeIso: string;
  customerName: string;
  customerPhone: string;
}

interface IAssistedRequest {
  tenantId: string;
  actorId: string;
  actorRole: 'ADMIN' | 'PROFESSIONAL';
  serviceId: string;
  startTimeIso: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  professionalId?: string;
}

interface ICreateRequest {
  tenantId: string;
  serviceId: string;
  startTimeIso: string;
  customer: { id: string } | { name: string; phone: string };
  status: 'PENDENTE' | 'CONFIRMADO';
  professionalId: string | null;
  enforcePublicWindow: boolean;
}

const SCHEDULE_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

function isAppointmentConflictError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const databaseError = error as Error & { code?: string };
  return (
    databaseError.code === 'P0001' && error.message === 'Horario em conflito com outro agendamento'
  );
}

/** "HH:MM" ou "HH:MM:SS" (Postgres) -> "HH:MM". */
function toHHMM(value: string): string {
  const match = SCHEDULE_TIME_PATTERN.exec(value.trim());
  if (!match) {
    throw new AppError('Formato de horário inválido. Use HH:MM', 400, 'INVALID_TIME_FORMAT');
  }
  const hours = match[1] ?? '00';
  const minutes = match[2] ?? '00';
  return `${hours.padStart(2, '0')}:${minutes}`;
}

export class CreateAppointmentUseCase {
  /** Fluxo público: mantém cadastro por nome/telefone e status PENDENTE. */
  async execute({ slug, serviceId, startTimeIso, customerName, customerPhone }: IPublicRequest) {
    const [tenant] = await db
      .select({ id: tenants.id, status: tenants.status })
      .from(tenants)
      .where(eq(tenants.slug, slug));
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
    }

    return this.create({
      tenantId: tenant.id,
      serviceId,
      startTimeIso,
      customer: { name: customerName, phone: customerPhone },
      status: 'PENDENTE',
      professionalId: null,
      enforcePublicWindow: true,
    });
  }

  /** Criação pela equipe: cliente existente ou cadastro rápido, confirmado imediatamente. */
  async executeAssisted(request: IAssistedRequest) {
    if (
      request.actorRole === 'PROFESSIONAL' &&
      request.professionalId &&
      request.professionalId !== request.actorId
    ) {
      throw new AppError(
        'Profissionais só podem agendar para si mesmos',
        403,
        'FORBIDDEN_PROFESSIONAL_ASSIGNMENT',
      );
    }

    const professionalId =
      request.actorRole === 'PROFESSIONAL' ? request.actorId : (request.professionalId ?? null);
    const customer = request.customerId
      ? { id: request.customerId }
      : { name: request.customerName ?? '', phone: request.customerPhone ?? '' };

    return this.create({
      tenantId: request.tenantId,
      serviceId: request.serviceId,
      startTimeIso: request.startTimeIso,
      customer,
      status: 'CONFIRMADO',
      professionalId,
      enforcePublicWindow: false,
    });
  }

  private async create({
    tenantId,
    serviceId,
    startTimeIso,
    customer,
    status,
    professionalId,
    enforcePublicWindow,
  }: ICreateRequest) {
    return withTenant(tenantId, async (tx) => {
      const [tenant] = await tx
        .select({
          id: tenants.id,
          timezone: tenants.timezone,
          status: tenants.status,
          publicBookingUntil: tenants.publicBookingUntil,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for('share');
      if (!tenant || tenant.status !== 'ACTIVE') {
        throw new AppError('Estabelecimento não encontrado', 404, 'TENANT_NOT_FOUND');
      }

      // As regras de serviço, duração, expediente e disponibilidade são comuns aos dois fluxos.
      const [service] = await tx
        .select({
          id: services.id,
          durationMinutes: services.durationMinutes,
          active: services.active,
        })
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)));
      if (!service || !service.active) {
        throw new AppError('Serviço não encontrado ou inativo', 404, 'SERVICE_NOT_FOUND');
      }

      const startTime = new Date(startTimeIso);
      const now = new Date();
      if (isNaN(startTime.getTime())) {
        throw new AppError('Data/Hora de início inválida', 400, 'INVALID_DATE');
      }
      const minAllowedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      if (startTime < minAllowedTime) {
        throw new AppError(
          'Agendamentos devem ser feitos com no mínimo 2 horas de antecedência',
          400,
          'MIN_ADVANCE_TIME',
        );
      }
      const zonedStart = utcToZoned(startTime, tenant.timezone);
      if (
        enforcePublicWindow &&
        (zonedStart.isoDate > tenant.publicBookingUntil ||
          zonedStart.isoDate > addDaysToIsoDate(todayInTimezone(tenant.timezone, now), 90))
      ) {
        throw new AppError(
          'Data fora do período de agendamento público permitido',
          400,
          'DATE_OUT_OF_RANGE',
        );
      }

      const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);
      const [schedule] = await tx
        .select()
        .from(scheduleConfigs)
        .where(
          and(
            eq(scheduleConfigs.tenantId, tenantId),
            eq(scheduleConfigs.dayOfWeek, zonedStart.dayOfWeek),
          ),
        );
      if (!schedule || schedule.isClosed) {
        throw new AppError(
          'Estabelecimento fechado no dia selecionado',
          400,
          'ESTABLISHMENT_CLOSED',
        );
      }
      const scheduleOpen = zonedToUtc(
        zonedStart.isoDate,
        toHHMM(schedule.openTime),
        tenant.timezone,
      );
      const scheduleClose = zonedToUtc(
        zonedStart.isoDate,
        toHHMM(schedule.closeTime),
        tenant.timezone,
      );
      if (startTime < scheduleOpen || endTime > scheduleClose) {
        throw new AppError(
          'O horário selecionado está fora do expediente de funcionamento',
          400,
          'OUT_OF_BUSINESS_HOURS',
        );
      }

      const conflictingAppointments = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            inArray(appointments.status, ['PENDENTE', 'CONFIRMADO']),
            sql`${appointments.startTime} < ${endTime} AND ${appointments.endTime} > ${startTime}`,
          ),
        );
      if (conflictingAppointments.length > 0) {
        throw new AppError(
          'O horário selecionado não está mais disponível',
          409,
          'SLOT_UNAVAILABLE',
        );
      }

      let customerId: string;
      if ('id' in customer) {
        const [existingCustomer] = await tx
          .select({ id: customers.id })
          .from(customers)
          .where(and(eq(customers.id, customer.id), eq(customers.tenantId, tenantId)));
        if (!existingCustomer) {
          throw new AppError('Cliente não encontrado', 404, 'CUSTOMER_NOT_FOUND');
        }
        customerId = existingCustomer.id;
      } else {
        const [existingCustomer] = await tx
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.tenantId, tenantId),
              eq(customers.phone, customer.phone),
              eq(customers.name, customer.name),
            ),
          );
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const [newCustomer] = await tx
            .insert(customers)
            .values({ tenantId, name: customer.name, phone: customer.phone })
            .returning();
          if (!newCustomer) {
            throw new AppError('Não foi possível criar o cliente', 500, 'CUSTOMER_CREATION_FAILED');
          }
          customerId = newCustomer.id;
        }
      }

      if (professionalId) {
        const [professional] = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, professionalId),
              eq(users.tenantId, tenantId),
              eq(users.role, 'PROFESSIONAL'),
              eq(users.active, true),
            ),
          );
        if (!professional) {
          throw new AppError(
            'Profissional não encontrado ou inativo',
            404,
            'PROFESSIONAL_NOT_FOUND',
          );
        }
      }

      const expiresAt =
        status === 'PENDENTE' ? new Date(now.getTime() + 12 * 60 * 60 * 1000) : null;
      try {
        const [newAppointment] = await tx
          .insert(appointments)
          .values({
            tenantId,
            serviceId: service.id,
            customerId,
            professionalId,
            startTime,
            endTime,
            status,
            expiresAt,
          })
          .returning();
        return newAppointment;
      } catch (error) {
        if (isAppointmentConflictError(error)) {
          throw new AppError(
            'O horário selecionado não está mais disponível',
            409,
            'SLOT_UNAVAILABLE',
          );
        }
        throw error;
      }
    });
  }
}
