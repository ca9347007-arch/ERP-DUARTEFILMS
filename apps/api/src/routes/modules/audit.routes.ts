import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRoles(UserRole.ADMIN));

auditRouter.get('/', asyncHandler(async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { companyId: req.auth!.companyId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  res.json({ logs });
}));
