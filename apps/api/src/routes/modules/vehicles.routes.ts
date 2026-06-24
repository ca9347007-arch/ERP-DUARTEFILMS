import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

const vehicleSchema = z.object({
  clientId: z.string().uuid(),
  plate: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().min(1),
  year: z.number().int().optional(),
  color: z.string().optional(),
  notes: z.string().optional()
});

vehiclesRouter.get('/', asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: req.auth!.companyId },
    include: { client: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ vehicles });
}));

vehiclesRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT), asyncHandler(async (req, res) => {
  const data = vehicleSchema.parse(req.body);
  await prisma.client.findFirstOrThrow({ where: { id: data.clientId, companyId: req.auth!.companyId } });
  const vehicle = await prisma.vehicle.create({ data: { companyId: req.auth!.companyId, ...data } });
  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'CREATE', entity: 'Vehicle', entityId: vehicle.id, after: vehicle, ip: req.ip });
  res.status(201).json({ vehicle });
}));
