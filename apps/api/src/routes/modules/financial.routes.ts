import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const financialRouter = Router();
financialRouter.use(requireAuth);

const entrySchema = z.object({
  type: z.enum(['REVENUE', 'EXPENSE']),
  description: z.string().min(2),
  category: z.string().min(2),
  amountCents: z.number().int().positive(),
  paymentMethod: z.enum(['CASH', 'CARD', 'PIX_MANUAL', 'TRANSFER', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'RECEIVED', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
  dueDate: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional()
});

financialRouter.get('/', asyncHandler(async (req, res) => {
  const entries = await prisma.financialEntry.findMany({ where: { companyId: req.auth!.companyId }, orderBy: { createdAt: 'desc' } });
  res.json({ entries });
}));

financialRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE), asyncHandler(async (req, res) => {
  const data = entrySchema.parse(req.body);
  const entry = await prisma.financialEntry.create({
    data: {
      companyId: req.auth!.companyId,
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paidAt: data.paidAt ? new Date(data.paidAt) : null
    }
  });
  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'CREATE', entity: 'FinancialEntry', entityId: entry.id, after: entry, ip: req.ip });
  res.status(201).json({ entry });
}));
