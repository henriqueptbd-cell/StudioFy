import { randomUUID } from 'node:crypto';
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
  serviceName: string;
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
    serviceName,
  };
});

test.afterAll(async () => {
  await api?.dispose();
});

test('cliente solicita um horário e o estabelecimento confirma no painel', async ({ page }) => {
  const runId = randomUUID().slice(0, 8);
  const customerName = `Cliente E2E ${runId}`;

  await page.goto(`/${fixture.slug}`);
  await page.getByRole('button', { name: 'Iniciar agendamento' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha o serviço' })).toBeVisible();

  await page.getByRole('button', { name: new RegExp(fixture.serviceName) }).click();
  await page.getByRole('link', { name: 'Continuar' }).click();

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
});
