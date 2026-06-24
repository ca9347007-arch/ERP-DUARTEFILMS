import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const clientsRouter = Router();
clientsRouter.use(requireAuth);

const createClientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional()
});

clientsRouter.get('/', asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { companyId: req.auth!.companyId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { vehicles: true }
  });
  res.json({ clients });
}));

clientsRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT), asyncHandler(async (req, res) => {
  const data = createClientSchema.parse(req.body);
  const client = await prisma.client.create({
    data: {
      companyId: req.auth!.companyId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      notes: data.notes
    }
  });
  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'CREATE', entity: 'Client', entityId: client.id, after: client, ip: req.ip });
  res.status(201).json({ client });
}));

clientsRouter.patch('/:id', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT), asyncHandler(async (req, res) => {
  const data = createClientSchema.partial().parse(req.body);
  const before = await prisma.client.findFirstOrThrow({ where: { id: req.params.id, companyId: req.auth!.companyId } });
  const client = await prisma.client.update({ where: { id: before.id }, data: { ...data, email: data.email || undefined } });
  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'UPDATE', entity: 'Client', entityId: client.id, before, after: client, ip: req.ip });
  res.json({ client });
}));
