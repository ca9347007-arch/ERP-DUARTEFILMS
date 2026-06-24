import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const quotesRouter = Router();
quotesRouter.use(requireAuth);

const quoteItemSchema = z.object({
  serviceId: z.string().uuid().optional(),
  description: z.string().min(2),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().min(0)
});

const createQuoteSchema = z.object({
  clientId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  title: z.string().min(2),
  discountCents: z.number().int().min(0).default(0),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1)
});

quotesRouter.get('/', asyncHandler(async (req, res) => {
  const quotes = await prisma.quote.findMany({
    where: { companyId: req.auth!.companyId },
    include: { client: true, vehicle: true, items: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ quotes });
}));

quotesRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT), asyncHandler(async (req, res) => {
  const data = createQuoteSchema.parse(req.body);
  await prisma.client.findFirstOrThrow({ where: { id: data.clientId, companyId: req.auth!.companyId } });

  const items = data.items.map((item) => ({
    ...item,
    totalCents: item.quantity * item.unitPriceCents
  }));
  const subtotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  const totalCents = Math.max(0, subtotalCents - data.discountCents);

  const quote = await prisma.quote.create({
    data: {
      companyId: req.auth!.companyId,
      clientId: data.clientId,
      vehicleId: data.vehicleId,
      title: data.title,
      discountCents: data.discountCents,
      subtotalCents,
      totalCents,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes,
      items: { create: items }
    },
    include: { items: true, client: true, vehicle: true }
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'CREATE', entity: 'Quote', entityId: quote.id, after: quote, ip: req.ip });
  res.status(201).json({ quote });
}));

quotesRouter.post('/:id/approve', requireRoles(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(async (req, res) => {
  const before = await prisma.quote.findFirstOrThrow({ where: { id: req.params.id, companyId: req.auth!.companyId } });
  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.update({ where: { id: before.id }, data: { status: 'APPROVED' } });
    const workOrder = await tx.workOrder.create({
      data: {
        companyId: req.auth!.companyId,
        quoteId: quote.id,
        clientId: quote.clientId,
        vehicleId: quote.vehicleId,
        status: 'OPEN',
        checklist: { limpeza: false, aplicacao: false, conferencia: false, entrega: false }
      }
    });
    return { quote, workOrder };
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'APPROVE', entity: 'Quote', entityId: before.id, before, after: result, ip: req.ip });
  res.json(result);
}));
