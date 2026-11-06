import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

type BookingFixture = {
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminToken: string;
  serviceName: string;
  serviceId: string;
  platformEmail: string;
  platformPassword: string;
};

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
let api: APIRequestContext | undefined;
let fixture: BookingFixture;

function assertIsolatedTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Defina DATABASE_URL para um banco PostgreSQL local de teste.');
  }

  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (!loopbackHosts.has(parsed.hostname) || !/(?:_test|_e2e)$/i.test(databaseName)) {
    throw new Error(
      'E2E bloqueado: use somente um PostgreSQL local com database terminado em _test ou _e2e.',
    );
  }
}

function tenantDate(daysAhead: number): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const date = new Date(Date.UTC(value('year'), value('month') - 1, value('day') + daysAhead));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function tenantDateTime(date: string, hour: number): string {
  return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00-03:00`).toISOString();
}

async function expectStatus(
  response: Awaited<ReturnType<APIRequestContext['post']>>,
  expectedStatus: number,
  operation: string,
): Promise<void> {
  if (response.status() !== expectedStatus) {
    throw new Error(`${operation} falhou com HTTP ${response.status()}.`);
  }
}

async function fillBookingForm(page: Page, customerName: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Nome completo' }).fill(customerName);
  await page.getByRole('textbox', { name: 'WhatsApp (com DDD)' }).fill('11987654321');
  await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
}

test.beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('E2E exige NODE_ENV=test.');
  }
  assertIsolatedTestDatabase();

  const apiUrl = new URL(process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3334');
  if (!loopbackHosts.has(apiUrl.hostname)) {
    throw new Error('E2E só pode chamar uma API local; endpoints externos são bloqueados.');
  }

  api = await request.newContext({ baseURL: apiUrl.origin });
  const runId = randomUUID().replaceAll('-', '').slice(0, 10);
  const adminEmail = `admin-${runId}@studiofy.test`;
  const adminPassword = `E2E-${runId}-Password!`;
  const serviceName = `Serviço E2E ${runId}`;

  const provisionResponse = await api.post('/api/v1/public/tenants/provision', {
    data: {
      tenant: {
        name: `Estúdio E2E ${runId}`,
        slug: `studiofy-e2e-${runId}`,
        phone: '5511999999999',
      },
      admin: {
        name: 'Admin E2E',
        email: adminEmail,
        password: adminPassword,
      },
    },
  });
  await expectStatus(provisionResponse, 201, 'Provisionamento do tenant E2E');
  const provision = (await provisionResponse.json()) as ApiEnvelope<{
    token: string;
    tenant: { slug: string };
  }>;
  const authorization = { Authorization: `Bearer ${provision.data.token}` };

  const serviceResponse = await api.post('/api/v1/admin/services', {
    headers: authorization,
    data: {
      name: serviceName,
      description: 'Serviço temporário usado somente pelo teste E2E.',
      durationMinutes: 30,
      price: 35,
    },
  });
  await expectStatus(serviceResponse, 201, 'Criação do serviço de teste');
  const service = (await serviceResponse.json()) as ApiEnvelope<{ id: string }>;

  const scheduleResponse = await api.put('/api/v1/admin/settings/schedule', {
    headers: authorization,
    data: {
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        openTime: '08:00',
        closeTime: '18:00',
        isClosed: false,
      })),
    },
  });
  await expectStatus(scheduleResponse, 200, 'Configuração do expediente de teste');

  fixture = {
    slug: provision.data.tenant.slug,
    adminEmail,
    adminPassword,
    adminToken: provision.data.token,
    serviceName,
    serviceId: service.data.id,
    platformEmail: `platform-${runId}@studiofy.test`,
    platformPassword: `E2E-${runId}-Platform-Strong!`,
  };

  execFileSync('npm', ['run', 'platform-admin:create', '--prefix', 'backend'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PLATFORM_ADMIN_NAME: 'Superadmin E2E',
      PLATFORM_ADMIN_EMAIL: fixture.platformEmail,
      PLATFORM_ADMIN_PASSWORD: fixture.platformPassword,
    },
    stdio: 'pipe',
  });
});

test.afterAll(async () => {
  await api?.dispose();
});

test('cliente solicita e equipe confirma; painel também agenda para cliente existente', async ({
  page,
}) => {
  const runId = randomUUID().slice(0, 8);
  const customerName = `Cliente E2E ${runId}`;

  await page.goto(`/${fixture.slug}`);
  await page.getByRole('button', { name: 'Iniciar agendamento' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha o serviço' })).toBeVisible();

  await page.getByRole('button', { name: new RegExp(fixture.serviceName) }).click();
  await page.getByRole('link', { name: 'Continuar' }).click();

  await page.getByRole('button', { name: 'Mostrar próximos 8 dias' }).click();
  const firstDateOnNextPage = Number(tenantDate(8).slice(8, 10));
  await expect(
    page.getByRole('button', { name: new RegExp(`${firstDateOnNextPage} de`) }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar 8 dias anteriores' }).click();
  await page.getByRole('button', { name: /Amanhã/ }).click();
  const availableSlot = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
  await expect(availableSlot).toBeVisible();
  await availableSlot.click();
  await page.getByRole('link', { name: 'Continuar' }).click();

  await fillBookingForm(page, customerName);
  await expect(page).toHaveURL(new RegExp(`/${fixture.slug}/agendar/confirmacao$`));
  await expect(page.getByRole('heading', { name: 'Agendamento solicitado!' })).toBeVisible();
  await expect(page.getByText('PENDENTE', { exact: true })).toBeVisible();
  await expect(page.getByText(customerName, { exact: true })).toBeVisible();

  await page.goto('/admin/login');
  await page.getByRole('textbox', { name: 'Slug do estabelecimento' }).fill(fixture.slug);
  await page.getByRole('textbox', { name: 'E-mail' }).fill(fixture.adminEmail);
  await page.getByLabel('Senha').fill(fixture.adminPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.goto('/admin/agendamentos');
  await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
  const appointmentCard = page
    .getByText(customerName, { exact: true })
    .locator('xpath=../../../..');
  await expect(appointmentCard.getByText('PENDENTE', { exact: true })).toBeVisible();
  await appointmentCard.getByRole('button', { name: 'Confirmar' }).click();
  await expect(appointmentCard.getByText('CONFIRMADO', { exact: true })).toBeVisible();

  await page.reload();
  const persistedAppointment = page
    .getByText(customerName, { exact: true })
    .locator('xpath=../../../..');
  await expect(persistedAppointment.getByText('CONFIRMADO', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Novo agendamento' }).click();
  const assistedDialog = page.getByRole('dialog', { name: 'Novo agendamento' });
  await expect(assistedDialog).toBeVisible();
  await assistedDialog
    .getByRole('textbox', { name: 'Buscar por nome ou telefone' })
    .fill(customerName);
  const existingCustomer = assistedDialog.getByRole('button', { name: new RegExp(customerName) });
  await expect(existingCustomer).toBeVisible();
  await existingCustomer.click();
  await assistedDialog.getByLabel('Serviço ativo').selectOption({
    label: `${fixture.serviceName} · 30 min`,
  });
  await assistedDialog.getByLabel('Data do atendimento').fill(tenantDate(1));
  const assistedSlot = assistedDialog.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
  await expect(assistedSlot).toBeVisible();
  await assistedSlot.click();
  await assistedDialog.getByRole('button', { name: 'Confirmar agendamento' }).click();
  await expect(assistedDialog).toBeHidden();
  await expect(page.getByText('Agendamento criado e confirmado.', { exact: true })).toBeVisible();

  await expect(page.getByText(customerName, { exact: true })).toHaveCount(2);
  const assistedAppointmentCard = page
    .getByText(customerName, { exact: true })
    .last()
    .locator('xpath=../../../..');
  await expect(assistedAppointmentCard.getByText('CONFIRMADO', { exact: true })).toBeVisible();
});

test('janela configurada bloqueia booking público após o limite e mantém fluxo assistido fora dele', async ({
  page,
}) => {
  if (!api) throw new Error('API E2E não inicializada.');
  const authorization = { Authorization: `Bearer ${fixture.adminToken}` };
  const publicBookingUntil = tenantDate(1);
  const outsideWindowDate = tenantDate(2);
  const customerName = `Cliente Janela E2E ${randomUUID().slice(0, 8)}`;
  let restoreWindow = false;

  try {
    restoreWindow = true;
    const update = await api.put('/api/v1/admin/settings/booking-window', {
      headers: authorization,
      data: { publicBookingUntil },
    });
    expect(update.status()).toBe(200);
    const settingsResponse = await api.get('/api/v1/admin/settings', { headers: authorization });
    expect(settingsResponse.status()).toBe(200);
    expect((await settingsResponse.json()).data.tenant.publicBookingUntil).toBe(publicBookingUntil);

    const inclusiveBooking = await api.post(`/api/v1/public/tenants/${fixture.slug}/appointments`, {
      data: {
        serviceId: fixture.serviceId,
        startTime: tenantDateTime(publicBookingUntil, 11),
        customer: { name: customerName, phone: '11987651234' },
      },
    });
    expect(inclusiveBooking.status()).toBe(201);

    const publicSlotsOutsideWindow = await api.get(
      `/api/v1/public/tenants/${fixture.slug}/slots?date=${outsideWindowDate}&serviceId=${fixture.serviceId}`,
    );
    expect(publicSlotsOutsideWindow.status()).toBe(400);
    expect((await publicSlotsOutsideWindow.json()).error.code).toBe('DATE_OUT_OF_RANGE');

    const publicBookingOutsideWindow = await api.post(
      `/api/v1/public/tenants/${fixture.slug}/appointments`,
      {
        data: {
          serviceId: fixture.serviceId,
          startTime: tenantDateTime(outsideWindowDate, 11),
          customer: { name: `${customerName} fora`, phone: '11987651235' },
        },
      },
    );
    expect(publicBookingOutsideWindow.status()).toBe(400);
    expect((await publicBookingOutsideWindow.json()).error.code).toBe('DATE_OUT_OF_RANGE');

    await page.goto('/admin/login');
    await page.getByRole('textbox', { name: 'Slug do estabelecimento' }).fill(fixture.slug);
    await page.getByRole('textbox', { name: 'E-mail' }).fill(fixture.adminEmail);
    await page.getByLabel('Senha').fill(fixture.adminPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await page.goto('/admin/agendamentos');
    await page.getByRole('button', { name: 'Novo agendamento' }).click();

    const assistedDialog = page.getByRole('dialog', { name: 'Novo agendamento' });
    await expect(assistedDialog).toBeVisible();
    await assistedDialog
      .getByRole('textbox', { name: 'Buscar por nome ou telefone' })
      .fill(customerName);
    const customer = assistedDialog.getByRole('button', { name: new RegExp(customerName) });
    await expect(customer).toBeVisible();
    await customer.click();
    await assistedDialog.getByLabel('Serviço ativo').selectOption({
      label: `${fixture.serviceName} · 30 min`,
    });
    await assistedDialog.getByLabel('Data do atendimento').fill(outsideWindowDate);
    const assistedSlot = assistedDialog.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
    await expect(assistedSlot).toBeVisible();
    await assistedSlot.click();
    await assistedDialog.getByRole('button', { name: 'Confirmar agendamento' }).click();
    await expect(assistedDialog).toBeHidden();
    await expect(page.getByText('Agendamento criado e confirmado.', { exact: true })).toBeVisible();
  } finally {
    if (restoreWindow) {
      const restore = await api.put('/api/v1/admin/settings/booking-window', {
        headers: authorization,
        data: { publicBookingUntil: tenantDate(30) },
      });
      expect(restore.status()).toBe(200);
    }
  }
});

test('superadmin entra na console e pausa/reativa um tenant com motivo', async ({ page }) => {
  await page.goto('/superadmin/login');
  await page.getByRole('textbox', { name: 'E-mail administrativo' }).fill(fixture.platformEmail);
  await page.getByLabel('Senha').fill(fixture.platformPassword);
  await page.getByRole('button', { name: 'Entrar na plataforma' }).click();
  await expect(page).toHaveURL(/\/superadmin$/);
  await expect(page.getByRole('heading', { name: 'Estabelecimentos' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Buscar estabelecimentos' }).fill(fixture.slug);
  const tenantRow = page.getByRole('row').filter({ hasText: fixture.slug });
  await expect(tenantRow).toBeVisible();
  await tenantRow.getByRole('button', { name: 'Gerenciar' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(fixture.slug);
  await dialog.locator('textarea').nth(1).fill('Pausa exercitada pelo cenário E2E.');
  await dialog.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(dialog.getByText('Pausado', { exact: true })).toBeVisible();

  await dialog.locator('textarea').nth(1).fill('Reativação exercitada pelo cenário E2E.');
  await dialog.getByRole('button', { name: 'Reativar', exact: true }).click();
  await expect(dialog.getByText('Ativo', { exact: true })).toBeVisible();
});
