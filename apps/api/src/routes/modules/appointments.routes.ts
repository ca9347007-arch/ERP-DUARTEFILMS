import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);

appointmentsRouter.get('/', asyncHandler(async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { companyId: req.auth!.companyId },
    orderBy: { startsAt: 'asc' },
    include: { client: true, vehicle: true, service: true, installer: { select: { id: true, name: true } } }
  });
  res.json({ appointments });
}));

appointmentsRouter.patch('/:id/status', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT, UserRole.INSTALLER), asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'IN_SERVICE', 'FINISHED', 'CANCELLED', 'NO_SHOW']) }).parse(req.body);
  const before = await prisma.appointment.findFirstOrThrow({ where: { id: req.params.id, companyId: req.auth!.companyId } });
  const appointment = await prisma.appointment.update({ where: { id: before.id }, data: { status: body.status } });
  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'UPDATE_STATUS', entity: 'Appointment', entityId: appointment.id, before, after: appointment, ip: req.ip });
  res.json({ appointment });
}));
