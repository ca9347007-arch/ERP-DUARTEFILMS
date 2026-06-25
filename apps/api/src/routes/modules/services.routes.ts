import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const servicesRouter = Router();
servicesRouter.use(requireAuth);

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(15).max(480),
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true)
});

const updateServiceSchema = serviceSchema.partial();

servicesRouter.get('/', asyncHandler(async (req, res) => {
  const services = await prisma.service.findMany({
    where: { companyId: req.auth!.companyId },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
  });
  res.json({ services });
}));

servicesRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(async (req, res) => {
  const data = serviceSchema.parse(req.body);
  const service = await prisma.service.create({ data: { companyId: req.auth!.companyId, ...data } });
  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'CREATE', entity: 'Service', entityId: service.id, after: service, ip: req.ip });
  res.status(201).json({ service });
}));

servicesRouter.patch('/:id', requireRoles(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(async (req, res) => {
  const data = updateServiceSchema.parse(req.body);
  const before = await prisma.service.findFirstOrThrow({
    where: { id: req.params.id, companyId: req.auth!.companyId }
  });

  const service = await prisma.service.update({
    where: { id: before.id },
    data
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'UPDATE', entity: 'Service', entityId: service.id, before, after: service, ip: req.ip });
  res.json({ service });
}));
