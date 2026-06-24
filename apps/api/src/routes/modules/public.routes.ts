import crypto from 'node:crypto';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { publicScheduleRateLimit } from '../../middlewares/rateLimits.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const publicRouter = Router();
publicRouter.use(publicScheduleRateLimit);

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 18;
const LOCAL_OFFSET = '-03:00';
type PrismaExecutor = Pick<typeof prisma, 'appointment'>;

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente de confirmação',
  CONFIRMED: 'Confirmado',
  IN_SERVICE: 'Em atendimento',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu'
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function normalizeText(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function createLocalDate(date: string, hour: number, minute = 0) {
  return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000${LOCAL_OFFSET}`);
}

function generatePublicCode(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DF-${yyyy}${mm}${dd}-${token}`;
}

async function getAvailableSlots(service: { durationMinutes: number }, date: string, tx: PrismaExecutor = prisma) {
  const dayStart = createLocalDate(date, 0);
  const dayEnd = createLocalDate(date, 23, 59);
  const now = new Date();

  const appointments = await tx.appointment.findMany({
    where: {
      companyId: DEFAULT_COMPANY_ID,
      startsAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] }
    },
    select: { startsAt: true, endsAt: true }
  });

  const slots: string[] = [];
  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
    const startsAt = createLocalDate(date, hour);
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60 * 1000);

    if (startsAt <= now) continue;
    if (endsAt > createLocalDate(date, BUSINESS_END_HOUR)) continue;

    const conflict = appointments.some((appt) => startsAt < appt.endsAt && endsAt > appt.startsAt);
    if (!conflict) slots.push(startsAt.toISOString());
  }

  return slots;
}

publicRouter.get('/services', asyncHandler(async (_req, res) => {
  const services = await prisma.service.findMany({
    where: { companyId: DEFAULT_COMPANY_ID, isActive: true, isPublic: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      basePriceCents: true,
      durationMinutes: true
    }
  });
  res.json({ services });
}));

publicRouter.get('/availability', asyncHandler(async (req, res) => {
  const query = z.object({
    serviceId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).parse(req.query);

  const service = await prisma.service.findFirst({
    where: { id: query.serviceId, companyId: DEFAULT_COMPANY_ID, isActive: true, isPublic: true },
    select: { id: true, durationMinutes: true }
  });
  if (!service) throw new AppError(404, 'Serviço não encontrado.');

  const slots = await getAvailableSlots(service, query.date);
  res.json({ slots });
}));

const publicAppointmentSchema = z.object({
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  client: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(30).transform(normalizePhone),
    email: z.string().trim().email().optional().or(z.literal(''))
  }),
  vehicle: z.object({
    brand: z.string().trim().max(80).optional(),
    model: z.string().trim().min(1).max(100),
    year: z.number().int().min(1950).max(2100).optional(),
    color: z.string().trim().max(40).optional(),
    plate: z.string().trim().max(12).optional()
  }).optional(),
  notes: z.string().trim().max(500).optional()
});

publicRouter.post('/appointments', asyncHandler(async (req, res) => {
  const data = publicAppointmentSchema.parse(req.body);
  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, companyId: DEFAULT_COMPANY_ID, isActive: true, isPublic: true },
    select: { id: true, name: true, durationMinutes: true }
  });
  if (!service) throw new AppError(404, 'Serviço não encontrado.');

  const startsAt = new Date(data.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new AppError(400, 'Horário inválido.');

  const date = data.startsAt.slice(0, 10);
  const availableSlots = await getAvailableSlots(service, date);
  if (!availableSlots.includes(startsAt.toISOString())) {
    throw new AppError(409, 'Horário indisponível ou fora do expediente. Escolha outro horário.');
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60 * 1000);

  const appointment = await prisma.$transaction(async (tx) => {
    const freshSlots = await getAvailableSlots(service, date, tx);
    if (!freshSlots.includes(startsAt.toISOString())) {
      throw new AppError(409, 'Horário indisponível. Escolha outro horário.');
    }

    let publicCode = generatePublicCode(startsAt);
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await tx.appointment.findUnique({ where: { publicCode } });
      if (!existing) break;
      publicCode = generatePublicCode(startsAt);
    }

    const client = await tx.client.create({
      data: {
        companyId: DEFAULT_COMPANY_ID,
        name: data.client.name,
        phone: data.client.phone,
        email: data.client.email || null
      }
    });

    const vehicle = data.vehicle
      ? await tx.vehicle.create({
          data: {
            companyId: DEFAULT_COMPANY_ID,
            clientId: client.id,
            brand: normalizeText(data.vehicle.brand),
            model: data.vehicle.model,
            year: data.vehicle.year,
            color: normalizeText(data.vehicle.color),
            plate: normalizeText(data.vehicle.plate)?.toUpperCase()
          }
        })
      : null;

    return tx.appointment.create({
      data: {
        companyId: DEFAULT_COMPANY_ID,
        publicCode,
        clientId: client.id,
        vehicleId: vehicle?.id,
        serviceId: service.id,
        startsAt,
        endsAt,
        notes: normalizeText(data.notes),
        source: 'PUBLIC'
      },
      select: { publicCode: true }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  res.status(201).json({
    ok: true,
    protocol: appointment.publicCode,
    message: 'Agendamento recebido. A equipe entrará em contato para confirmar.'
  });
}));

const lookupSchema = z.object({
  protocol: z.string().trim().min(6).max(32).transform((value) => value.toUpperCase()),
  phone: z.string().trim().min(8).max(30).transform(normalizePhone)
});

publicRouter.post('/appointments/lookup', asyncHandler(async (req, res) => {
  const data = lookupSchema.parse(req.body);

  const appointment = await prisma.appointment.findFirst({
    where: { companyId: DEFAULT_COMPANY_ID, publicCode: data.protocol },
    select: {
      publicCode: true,
      status: true,
      startsAt: true,
      endsAt: true,
      client: { select: { name: true, phone: true } },
      service: { select: { name: true } },
      vehicle: { select: { model: true, plate: true } }
    }
  });

  if (!appointment || normalizePhone(appointment.client.phone) !== data.phone) {
    throw new AppError(404, 'Agendamento não encontrado para o protocolo e WhatsApp informados.');
  }

  res.json({
    appointment: {
      protocol: appointment.publicCode,
      status: appointment.status,
      statusLabel: statusLabels[appointment.status] ?? appointment.status,
      service: appointment.service.name,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      customerName: appointment.client.name.split(' ')[0],
      vehicle: appointment.vehicle,
      message: appointment.status === 'PENDING'
        ? 'Seu agendamento foi recebido e ainda será confirmado pela equipe.'
        : 'Este é o status atual do seu atendimento.'
    }
  });
}));
