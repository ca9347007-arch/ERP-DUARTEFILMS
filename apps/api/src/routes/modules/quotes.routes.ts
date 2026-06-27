import { Router } from 'express';
import { QuoteStatus, UserRole, WorkOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const quotesRouter = Router();
quotesRouter.use(requireAuth);

const quoteItemSchema = z.object({
  serviceId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  description: z.string().min(2),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().min(0)
});

const quotePayloadSchema = z.object({
  clientId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  title: z.string().min(2),
  discountCents: z.number().int().min(0).default(0),
  issuedAt: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1)
});

const updateQuoteStatusSchema = z.object({
  status: z.nativeEnum(QuoteStatus),
  notes: z.string().optional()
});

function buildCode(sequence: number) {
  return String(sequence).padStart(6, '0');
}

async function nextSequence(tx: typeof prisma, companyId: string, model: 'quote' | 'workOrder') {
  const result = model === 'quote'
    ? await tx.quote.aggregate({ where: { companyId }, _max: { sequence: true } })
    : await tx.workOrder.aggregate({ where: { companyId }, _max: { sequence: true } });
  return (result._max.sequence ?? 0) + 1;
}

async function validateQuoteLinks(tx: typeof prisma, companyId: string, data: z.infer<typeof quotePayloadSchema>) {
  await tx.client.findFirstOrThrow({ where: { id: data.clientId, companyId } });

  if (data.vehicleId) {
    await tx.vehicle.findFirstOrThrow({ where: { id: data.vehicleId, companyId, clientId: data.clientId } });
  }

  if (data.appointmentId) {
    await tx.appointment.findFirstOrThrow({ where: { id: data.appointmentId, companyId, clientId: data.clientId } });
  }

  for (const item of data.items) {
    if (item.serviceId) await tx.service.findFirstOrThrow({ where: { id: item.serviceId, companyId } });
    if (item.productId) await tx.product.findFirstOrThrow({ where: { id: item.productId, companyId, isActive: true } });
  }
}

function calculateItems(items: z.infer<typeof quoteItemSchema>[]) {
  const normalizedItems = items.map((item) => ({
    serviceId: item.serviceId,
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    totalCents: item.quantity * item.unitPriceCents
  }));
  const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.totalCents, 0);
  return { normalizedItems, subtotalCents };
}

const quoteInclude = {
  client: true,
  vehicle: true,
  appointment: { include: { service: true, client: true, vehicle: true } },
  items: { include: { service: true, product: true }, orderBy: { id: 'asc' } },
  workOrders: { orderBy: { createdAt: 'desc' } }
} as const;

quotesRouter.get('/', asyncHandler(async (req, res) => {
  const quotes = await prisma.quote.findMany({
    where: { companyId: req.auth!.companyId },
    include: quoteInclude,
    orderBy: { createdAt: 'desc' }
  });

  res.json({ quotes });
}));

quotesRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT), asyncHandler(async (req, res) => {
  const data = quotePayloadSchema.parse(req.body);

  const quote = await prisma.$transaction(async (tx) => {
    await validateQuoteLinks(tx as typeof prisma, req.auth!.companyId, data);

    const sequence = await nextSequence(tx as typeof prisma, req.auth!.companyId, 'quote');
    const { normalizedItems, subtotalCents } = calculateItems(data.items);
    const totalCents = Math.max(0, subtotalCents - data.discountCents);

    return tx.quote.create({
      data: {
        companyId: req.auth!.companyId,
        code: buildCode(sequence),
        sequence,
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        appointmentId: data.appointmentId,
        title: data.title,
        status: QuoteStatus.SENT,
        discountCents: data.discountCents,
        subtotalCents,
        totalCents,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes,
        items: { create: normalizedItems }
      },
      include: quoteInclude
    });
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'CREATE', entity: 'Quote', entityId: quote.id, after: quote, ip: req.ip });
  res.status(201).json({ quote });
}));

quotesRouter.patch('/:id', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT), asyncHandler(async (req, res) => {
  const data = quotePayloadSchema.parse(req.body);
  const before = await prisma.quote.findFirstOrThrow({ where: { id: req.params.id, companyId: req.auth!.companyId }, include: quoteInclude });

  const quote = await prisma.$transaction(async (tx) => {
    await validateQuoteLinks(tx as typeof prisma, req.auth!.companyId, data);
    const { normalizedItems, subtotalCents } = calculateItems(data.items);
    const totalCents = Math.max(0, subtotalCents - data.discountCents);

    await tx.quoteItem.deleteMany({ where: { quoteId: before.id } });

    return tx.quote.update({
      where: { id: before.id },
      data: {
        clientId: data.clientId,
        vehicleId: data.vehicleId || null,
        appointmentId: data.appointmentId || null,
        title: data.title,
        discountCents: data.discountCents,
        subtotalCents,
        totalCents,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : before.issuedAt,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes,
        items: { create: normalizedItems }
      },
      include: quoteInclude
    });
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'UPDATE', entity: 'Quote', entityId: quote.id, before, after: quote, ip: req.ip });
  res.json({ quote });
}));

quotesRouter.patch('/:id/status', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT), asyncHandler(async (req, res) => {
  const data = updateQuoteStatusSchema.parse(req.body);
  const before = await prisma.quote.findFirstOrThrow({
    where: { id: req.params.id, companyId: req.auth!.companyId },
    include: { items: true, workOrders: true }
  });

  const quote = await prisma.quote.update({
    where: { id: before.id },
    data: {
      status: data.status,
      notes: data.notes === undefined ? before.notes : data.notes
    },
    include: quoteInclude
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'UPDATE_STATUS', entity: 'Quote', entityId: quote.id, before, after: quote, ip: req.ip });
  res.json({ quote });
}));

quotesRouter.post('/:id/approve', requireRoles(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(async (req, res) => {
  const before = await prisma.quote.findFirstOrThrow({
    where: { id: req.params.id, companyId: req.auth!.companyId },
    include: { workOrders: true }
  });

  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.update({ where: { id: before.id }, data: { status: QuoteStatus.APPROVED } });

    const existingWorkOrder = before.workOrders[0];
    if (existingWorkOrder) {
      return { quote, workOrder: existingWorkOrder };
    }

    const sequence = await nextSequence(tx as typeof prisma, req.auth!.companyId, 'workOrder');

    const workOrder = await tx.workOrder.create({
      data: {
        companyId: req.auth!.companyId,
        code: buildCode(sequence),
        sequence,
        quoteId: quote.id,
        clientId: quote.clientId,
        vehicleId: quote.vehicleId,
        status: WorkOrderStatus.OPEN,
        checklist: { limpeza: false, aplicacao: false, conferencia: false, entrega: false }
      }
    });

    return { quote, workOrder };
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'APPROVE', entity: 'Quote', entityId: before.id, before, after: result, ip: req.ip });
  res.json(result);
}));
