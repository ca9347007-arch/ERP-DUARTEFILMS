import { Router } from 'express';
import { z } from 'zod';
import { Prisma, UserRole } from '@prisma/client';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const stockMovementsRouter = Router();
stockMovementsRouter.use(requireAuth);

stockMovementsRouter.get('/', asyncHandler(async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    where: { companyId: req.auth!.companyId },
    orderBy: { createdAt: 'desc' },
    include: { product: true, user: { select: { id: true, name: true } } }
  });
  res.json({ movements });
}));

stockMovementsRouter.post('/', requireRoles(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(async (req, res) => {
  const data = z.object({
    productId: z.string().uuid(),
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    quantity: z.number().positive(),
    reason: z.string().optional()
  }).parse(req.body);

  const product = await prisma.product.findFirstOrThrow({ where: { id: data.productId, companyId: req.auth!.companyId } });
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
