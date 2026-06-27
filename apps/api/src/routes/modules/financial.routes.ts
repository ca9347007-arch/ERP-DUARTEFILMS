import { Router } from 'express';
import { FinancialStatus, FinancialType, UserRole } from '@prisma/client';
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
  amountCents: z.coerce.number().int().positive(),
  paymentMethod: z.enum(['CASH', 'CARD', 'PIX_MANUAL', 'TRANSFER', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'RECEIVED', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
  dueDate: z.string().datetime().optional().nullable(),
  paidAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable()
});

const updateEntrySchema = entrySchema.partial();

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

function normalizeDates<T extends { dueDate?: string | null; paidAt?: string | null }>(data: T) {
  return {
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
    paidAt: data.paidAt ? new Date(data.paidAt) : data.paidAt === null ? null : undefined
  };
}

financialRouter.get('/', asyncHandler(async (req, res) => {
  const companyId = req.auth!.companyId;
  const { start, end } = monthRange();

  const entries = await prisma.financialEntry.findMany({
    where: { companyId },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
  });

  const monthEntries = entries.filter((entry) => {
    const ref = entry.paidAt ?? entry.dueDate ?? entry.createdAt;
    return ref >= start && ref < end;
  });

  const receivedRevenueCents = entries
    .filter((entry) => entry.type === FinancialType.REVENUE && entry.status === FinancialStatus.RECEIVED)
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  const paidExpenseCents = entries
    .filter((entry) => entry.type === FinancialType.EXPENSE && entry.status === FinancialStatus.PAID)
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  const monthRevenueCents = monthEntries
    .filter((entry) => entry.type === FinancialType.REVENUE && entry.status !== FinancialStatus.CANCELLED)
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  const monthExpenseCents = monthEntries
    .filter((entry) => entry.type === FinancialType.EXPENSE && entry.status !== FinancialStatus.CANCELLED)
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  const payableCents = entries
    .filter((entry) => entry.type === FinancialType.EXPENSE && entry.status === FinancialStatus.PENDING)
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  const receivableCents = entries
    .filter((entry) => entry.type === FinancialType.REVENUE && entry.status === FinancialStatus.PENDING)
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  res.json({
    entries,
    summary: {
      cashBalanceCents: receivedRevenueCents - paidExpenseCents,
      monthRevenueCents,
      monthExpenseCents,
      payableCents,
      receivableCents,
      netMonthCents: monthRevenueCents - monthExpenseCents
    }
  });
}));

financialRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE), asyncHandler(async (req, res) => {
  const data = entrySchema.parse(req.body);

  const entry = await prisma.financialEntry.create({
    data: {
      companyId: req.auth!.companyId,
      ...normalizeDates(data)
    }
  });

  await audit({
    companyId: req.auth!.companyId,
    userId: req.auth!.userId,
    action: 'CREATE',
    entity: 'FinancialEntry',
    entityId: entry.id,
    after: entry,
    ip: req.ip
  });

  res.status(201).json({ entry });
}));

financialRouter.patch('/:id', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE), asyncHandler(async (req, res) => {
  const data = updateEntrySchema.parse(req.body);

  const previous = await prisma.financialEntry.findFirst({
    where: { id: req.params.id, companyId: req.auth!.companyId }
  });

  if (!previous) {
    return res.status(404).json({ message: 'Lançamento financeiro não encontrado.' });
  }

  const entry = await prisma.financialEntry.update({
    where: { id: previous.id },
    data: normalizeDates(data)
  });

  await audit({
    companyId: req.auth!.companyId,
    userId: req.auth!.userId,
    action: 'UPDATE',
    entity: 'FinancialEntry',
    entityId: entry.id,
    before: previous,
    after: entry,
    ip: req.ip
  });

  res.json({ entry });
}));

financialRouter.delete('/:id', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE), asyncHandler(async (req, res) => {
  const previous = await prisma.financialEntry.findFirst({
    where: { id: req.params.id, companyId: req.auth!.companyId }
  });

  if (!previous) {
    return res.status(404).json({ message: 'Lançamento financeiro não encontrado.' });
  }

  const entry = await prisma.financialEntry.update({
    where: { id: previous.id },
    data: { status: FinancialStatus.CANCELLED }
  });

  await audit({
    companyId: req.auth!.companyId,
    userId: req.auth!.userId,
    action: 'CANCEL',
    entity: 'FinancialEntry',
    entityId: entry.id,
    before: previous,
    after: entry,
    ip: req.ip
  });

  res.json({ entry });
}));