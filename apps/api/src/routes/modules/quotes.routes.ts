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
  description: z.string().min(2),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().min(0)
});

const createQuoteSchema = z.object({
  clientId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  title: z.string().min(2),
  discountCents: z.number().int().min(0).default(0),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1)
});

const updateQuoteStatusSchema = z.object({
  status: z.nativeEnum(QuoteStatus),
  notes: z.string().optional()
});

function yearRange(date = new Date()) {
  const year = date.getFullYear();
  return {
    year,
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year + 1, 0, 1, 0, 0, 0, 0)
  };
}

function buildCode(prefix: string, year: number, sequence: number) {
  return `${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}

quotesRouter.get('/', asyncHandler(async (req, res) => {
  const quotes = await prisma.quote.findMany({
    where: { companyId: req.auth!.companyId },
    include: {
      client: true,
      vehicle: true,
      items: { include: { service: true }, orderBy: { id: 'asc' } },
      workOrders: { orderBy: { createdAt: 'desc' } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ quotes });
}));

quotesRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT), asyncHandler(async (req, res) => {
  const data = createQuoteSchema.parse(req.body);

  const quote = await prisma.$transaction(async (tx) => {
    await tx.client.findFirstOrThrow({ where: { id: data.clientId, companyId: req.auth!.companyId } });

    if (data.vehicleId) {
      await tx.vehicle.findFirstOrThrow({ where: { id: data.vehicleId, companyId: req.auth!.companyId, clientId: data.clientId } });
    }

    if (data.appointmentId) {
      await tx.appointment.findFirstOrThrow({ where: { id: data.appointmentId, companyId: req.auth!.companyId, clientId: data.clientId } });
    }

    const { year, start, end } = yearRange();
    const sequence = await tx.quote.count({
      where: {
        companyId: req.auth!.companyId,
        createdAt: { gte: start, lt: end }
      }
    }) + 1;

    const items = data.items.map((item) => ({
      ...item,
      totalCents: item.quantity * item.unitPriceCents
    }));
    const subtotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
    const totalCents = Math.max(0, subtotalCents - data.discountCents);

    return tx.quote.create({
      data: {
        companyId: req.auth!.companyId,
        code: buildCode('OS', year, sequence),
        sequence,
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        title: data.title,
        status: QuoteStatus.SENT,
        discountCents: data.discountCents,
        subtotalCents,
        totalCents,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes,
        items: { create: items }
      },
      include: {
        items: { include: { service: true } },
        client: true,
        vehicle: true,
        workOrders: true
      }
    });
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'CREATE', entity: 'Quote', entityId: quote.id, after: quote, ip: req.ip });
  res.status(201).json({ quote });
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
    include: {
      client: true,
      vehicle: true,
      items: { include: { service: true } },
      workOrders: true
    }
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

    const { year, start, end } = yearRange();
    const sequence = await tx.workOrder.count({
      where: {
        companyId: req.auth!.companyId,
        createdAt: { gte: start, lt: end }
      }
    }) + 1;

    const workOrder = await tx.workOrder.create({
      data: {
        companyId: req.auth!.companyId,
        code: buildCode('WO', year, sequence),
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
