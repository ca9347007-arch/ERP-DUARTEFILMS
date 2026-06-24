import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'DuarteFilms',
      phone: '(00) 00000-0000',
      email: 'contato@duartefilms.local'
    }
  });

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@duartefilms.local' },
    update: { passwordHash, role: UserRole.ADMIN, companyId: company.id },
    create: {
      companyId: company.id,
      name: 'Administrador DuarteFilms',
      email: 'admin@duartefilms.local',
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  const services = [
    { name: 'Película automotiva completa', basePriceCents: 45000, durationMinutes: 180 },
    { name: 'Película dianteira', basePriceCents: 18000, durationMinutes: 90 },
    { name: 'Película arquitetônica', basePriceCents: 35000, durationMinutes: 120 },
    { name: 'Remoção de película antiga', basePriceCents: 12000, durationMinutes: 60 }
  ];

  for (const service of services) {
    const existing = await prisma.service.findFirst({ where: { companyId: company.id, name: service.name } });
    if (!existing) {
      await prisma.service.create({ data: { companyId: company.id, ...service } });
    }
  }

  await prisma.setting.upsert({
    where: { companyId_key: { companyId: company.id, key: 'schedule' } },
    update: {},
    create: {
      companyId: company.id,
      key: 'schedule',
      value: {
        startHour: 8,
        endHour: 18,
        slotMinutes: 60,
        timezone: 'America/Sao_Paulo'
      }
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
