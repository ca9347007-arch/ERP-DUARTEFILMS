import { Router } from 'express';
import { z } from 'zod';
import { Prisma, UserRole } from '@prisma/client';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const productsRouter = Router();
productsRouter.use(requireAuth);

const productSchema = z.object({
  name: z.string().min(2),
  brand: z.string().optional(),
  type: z.string().optional(),
  shade: z.string().optional(),
  line: z.string().optional(),
  unit: z.string().default('un'),
  costCents: z.number().int().min(0).default(0),
  stockQuantity: z.number().default(0),
  minStock: z.number().default(0)
});

productsRouter.get('/', asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({ where: { companyId: req.auth!.companyId, isActive: true }, orderBy: { name: 'asc' } });
  res.json({ products });
}));

productsRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(async (req, res) => {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({
    data: {
      companyId: req.auth!.companyId,
      name: data.name,
      brand: data.brand,
      type: data.type,
      shade: data.shade,
      line: data.line,
      unit: data.unit,
      costCents: data.costCents,
      stockQuantity: new Prisma.Decimal(data.stockQuantity),
      minStock: new Prisma.Decimal(data.minStock)
    }
  });
  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'CREATE', entity: 'Product', entityId: product.id, after: product, ip: req.ip });
  res.status(201).json({ product });
}));

productsRouter.post('/:id/movements', requireRoles(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(async (req, res) => {
  const data = z.object({
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    quantity: z.number().positive(),
    reason: z.string().optional()
  }).parse(req.body);

  const product = await prisma.product.findFirstOrThrow({ where: { id: req.params.id, companyId: req.auth!.companyId } });
  const current = Number(product.stockQuantity);
  const next = data.type === 'IN' ? current + data.quantity : data.type === 'OUT' ? current - data.quantity : data.quantity;
  if (next < 0) {
    throw new AppError(409, 'Estoque insuficiente para esta saída.');
  }

  const movement = await prisma.$transaction(async (tx) => {
    const created = await tx.stockMovement.create({
      data: {
        companyId: req.auth!.companyId,
        productId: product.id,
        userId: req.auth!.userId,
        type: data.type,
        quantity: new Prisma.Decimal(data.quantity),
        reason: data.reason
      }
    });
    await tx.product.update({ where: { id: product.id }, data: { stockQuantity: new Prisma.Decimal(next) } });
    return created;
  });

  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'STOCK_MOVEMENT', entity: 'Product', entityId: product.id, before: product, after: { movement, nextQuantity: next }, ip: req.ip });
  res.status(201).json({ movement });
}));
