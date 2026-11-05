import { z } from 'zod';
import { db, pool } from './client.js';
import { platformAdmins } from './schema.js';
import { PlatformAuthProvider } from '../modules/platform/PlatformAuthProvider.js';

const inputSchema = z.object({
  PLATFORM_ADMIN_NAME: z.string().trim().min(2).max(255),
  PLATFORM_ADMIN_EMAIL: z.string().email().max(255),
  PLATFORM_ADMIN_PASSWORD: z.string().min(12).max(200),
});

try {
  const input = inputSchema.parse(process.env);
  const email = input.PLATFORM_ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await PlatformAuthProvider.hashPassword(input.PLATFORM_ADMIN_PASSWORD);
  const [admin] = await db
    .insert(platformAdmins)
    .values({
      name: input.PLATFORM_ADMIN_NAME,
      email,
      passwordHash,
    })
    .returning({ id: platformAdmins.id, email: platformAdmins.email });

  if (!admin) throw new Error('Não foi possível criar o administrador da plataforma.');
  console.log(`Administrador da plataforma criado: ${admin.email} (${admin.id}).`);
} catch (error) {
  const databaseError = error as Error & { code?: string };
  if (databaseError.code === '23505') {
    console.error('Já existe uma conta de plataforma com este e-mail.');
    process.exitCode = 1;
  } else {
    console.error(
      error instanceof Error ? error.message : 'Falha ao criar administrador da plataforma.',
    );
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
