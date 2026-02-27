import { prisma } from '../src/config/prisma';

interface SeedUser {
  email: string;
  name: string;
  status: string;
}

const tenantAUsers: SeedUser[] = [
  { email: 'admin@acme.com', name: 'Admin', status: 'ADMIN' },
  { email: 'agent@acme.com', name: 'Agent', status: 'AGENT' },
  { email: 'client@acme.com', name: 'Client', status: 'CLIENT' },
  { email: 'nurse@acme.com', name: 'Nurse', status: 'AGENT' },
  { email: 'doctor@acme.com', name: 'Doctor', status: 'AGENT' },
  { email: 'patient2@acme.com', name: 'Patient 2', status: 'CLIENT' }
];

const upsertUserByEmail = async (tenantId: string, seedUser: SeedUser) => {
  const normalizedEmail = seedUser.email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      tenantId,
      email: normalizedEmail
    }
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: seedUser.name,
        status: seedUser.status
      }
    });
  }

  return prisma.user.create({
    data: {
      tenantId,
      email: normalizedEmail,
      name: seedUser.name,
      status: seedUser.status
    }
  });
};

const run = async (): Promise<void> => {
  const tenantA = await prisma.tenant.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: { name: 'Public Healthcare Chat' },
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Public Healthcare Chat'
    }
  });

  const tenantB = await prisma.tenant.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: { name: 'Beta Clinic' },
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Beta Clinic'
    }
  });

  const createdTenantAUsers: Array<Awaited<ReturnType<typeof upsertUserByEmail>>> = [];
  for (const seedUser of tenantAUsers) {
    createdTenantAUsers.push(await upsertUserByEmail(tenantA.id, seedUser));
  }

  await upsertUserByEmail(tenantB.id, {
    email: 'admin@beta.com',
    name: 'Beta Admin',
    status: 'ADMIN'
  });

  // Seed only users/tenants; chats are user-driven from UI flows.
};

run()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
