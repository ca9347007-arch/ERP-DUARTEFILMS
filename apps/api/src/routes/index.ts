import { Router } from 'express';
import { authRouter } from './modules/auth.routes.js';
import { dashboardRouter } from './modules/dashboard.routes.js';
import { clientsRouter } from './modules/clients.routes.js';
import { vehiclesRouter } from './modules/vehicles.routes.js';
import { servicesRouter } from './modules/services.routes.js';
import { publicRouter } from './modules/public.routes.js';
import { appointmentsRouter } from './modules/appointments.routes.js';
import { financialRouter } from './modules/financial.routes.js';
import { productsRouter } from './modules/products.routes.js';
import { auditRouter } from './modules/audit.routes.js';
import { quotesRouter } from './modules/quotes.routes.js';
import { reportsRouter } from './modules/reports.routes.js';
import { stockMovementsRouter } from './modules/stockMovements.routes.js';
import { tryRedisPing } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';

export const apiRouter = Router();

apiRouter.get('/health', async (_req, res) => {
  let database = 'OK';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'ERROR';
  }
  const redis = await tryRedisPing();
  res.json({ status: 'OK', service: 'duartefilms-api', database, redis });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/public', publicRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/clients', clientsRouter);
apiRouter.use('/vehicles', vehiclesRouter);
apiRouter.use('/services', servicesRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/quotes', quotesRouter);
apiRouter.use('/financial-entries', financialRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/stock-movements', stockMovementsRouter);
apiRouter.use('/audit-logs', auditRouter);
