import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRoles } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const companySettingsSchema = z.object({
  fantasyName: z.string().trim().min(2).max(140),
  legalName: z.string().trim().max(180).optional().or(z.literal('')),
  document: z.string().trim().max(30).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  whatsapp: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().max(220).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  state: z.string().trim().max(2).optional().or(z.literal('')),
  defaultQuoteValidityDays: z.number().int().min(1).max(90).default(7),
  quoteWarrantyText: z.string().trim().max(1000).optional().or(z.literal('')),
  quotePaymentText: z.string().trim().max(1000).optional().or(z.literal('')),
  businessHours: z.string().trim().max(120).optional().or(z.literal(''))
});

type CompanySettings = z.infer<typeof companySettingsSchema>;

const DEFAULT_TEXT = {
  quoteWarrantyText: 'Garantia conforme linha de película e serviço contratado.',
  quotePaymentText: 'Pagamento via PIX manual, dinheiro, cartão ou transferência.',
  businessHours: 'Segunda a sábado, das 08h às 18h.'
};

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(company: { name: string; document: string | null; phone: string | null; email: string | null }, raw: unknown): CompanySettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    fantasyName: asString(value.fantasyName) || company.name || 'DuarteFilms',
    legalName: asString(value.legalName),
    document: asString(value.document) || company.document || '',
    phone: asString(value.phone) || company.phone || '',
    whatsapp: asString(value.whatsapp) || company.phone || '',
    email: asString(value.email) || company.email || '',
    address: asString(value.address),
    city: asString(value.city),
    state: asString(value.state),
    defaultQuoteValidityDays: asNumber(value.defaultQuoteValidityDays, 7),
    quoteWarrantyText: asString(value.quoteWarrantyText) || DEFAULT_TEXT.quoteWarrantyText,
    quotePaymentText: asString(value.quotePaymentText) || DEFAULT_TEXT.quotePaymentText,
    businessHours: asString(value.businessHours) || DEFAULT_TEXT.businessHours
  };
}

settingsRouter.get('/company', asyncHandler(async (req, res) => {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: req.auth!.companyId } });
  const setting = await prisma.setting.findUnique({ where: { companyId_key: { companyId: req.auth!.companyId, key: 'company_profile' } } });
  res.json({ settings: normalize(company, setting?.value) });
}));

settingsRouter.patch('/company', requireRoles(UserRole.ADMIN, UserRole.MANAGER), asyncHandler(async (req, res) => {
  const data = companySettingsSchema.parse(req.body);
  const before = await prisma.company.findUniqueOrThrow({ where: { id: req.auth!.companyId } });

  const [company, setting] = await prisma.$transaction([
    prisma.company.update({
      where: { id: req.auth!.companyId },
      data: {
        name: data.fantasyName,
        document: data.document || null,
        phone: data.phone || data.whatsapp || null,
        email: data.email || null
      }
    }),
    prisma.setting.upsert({
      where: { companyId_key: { companyId: req.auth!.companyId, key: 'company_profile' } },
      create: { companyId: req.auth!.companyId, key: 'company_profile', value: data },
      update: { value: data }
    })
  ]);

  const settings = normalize(company, setting.value);
  await audit({ companyId: req.auth!.companyId, userId: req.auth!.userId, action: 'UPDATE', entity: 'CompanySettings', entityId: company.id, before, after: settings, ip: req.ip });
  res.json({ settings });
}));
