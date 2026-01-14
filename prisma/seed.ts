import * as argon2 from 'argon2';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

/**
 * Seed inicial (TypeScript).
 *
 * Observação:
 * - Mantemos também `seed.js` para execução direta no Docker (node).
 * - Este arquivo é útil para desenvolvimento/leitura do código.
 */
async function main() {
  const prisma = new PrismaClient();

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
  const passwordHash = await argon2.hash(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { roleId: adminRole.id, passwordHash, isActive: true },
    create: { email: adminEmail, passwordHash, roleId: adminRole.id, isActive: true },
  });

  // ADMIN pode tudo (facilita avaliação).
  await prisma.permission.upsert({
    where: {
      roleId_resource_action: {
        roleId: adminRole.id,
        resource: '*',
        action: '*',
      },
    },
    update: {},
    create: { roleId: adminRole.id, resource: '*', action: '*' },
  });

  // USER: acesso básico ao dashboard.
  await prisma.permission.upsert({
    where: {
      roleId_resource_action: {
        roleId: userRole.id,
        resource: '/dashboard',
        action: 'GET',
      },
    },
    update: {},
    create: { roleId: userRole.id, resource: '/dashboard', action: 'GET' },
  });

  const userEmail = process.env.SEED_USER_EMAIL ?? 'user@local.test';
  const userPassword = process.env.SEED_USER_PASSWORD ?? 'User@123';
  const userHash = await argon2.hash(userPassword);

  await prisma.user.upsert({
    where: { email: userEmail },
    update: { roleId: userRole.id, passwordHash: userHash, isActive: true },
    create: { email: userEmail, passwordHash: userHash, roleId: userRole.id, isActive: true },
  });

  await prisma.permissionAssignmentAudit.create({
    data: {
      actorUserId: adminUser.id,
      roleId: adminRole.id,
      resource: '*',
      action: '*',
    },
  });

  console.log('Seed concluído:', {
    admin: { email: adminEmail, password: adminPassword },
    user: { email: userEmail, password: userPassword },
    roles: { adminRoleId: adminRole.id, userRoleId: userRole.id },
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


