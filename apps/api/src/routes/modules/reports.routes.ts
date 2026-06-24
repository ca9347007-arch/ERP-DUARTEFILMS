import { Router } from 'express';
import { FinancialType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get('/financial-summary', asyncHandler(async (req, res) => {
  const companyId = req.auth!.companyId;
  const revenue = await prisma.financialEntry.aggregate({ where: { companyId, type: FinancialType.REVENUE }, _sum: { amountCents: true } });
  const expense = await prisma.financialEntry.aggregate({ where: { companyId, type: FinancialType.EXPENSE }, _sum: { amountCents: true } });
  const revenueCents = revenue._sum.amountCents ?? 0;
  const expenseCents = expense._sum.amountCents ?? 0;
  res.json({ revenueCents, expenseCents, profitCents: revenueCents - expenseCents });
}));
