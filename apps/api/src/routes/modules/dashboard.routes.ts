import { Router } from 'express';
import { AppointmentStatus, FinancialStatus, FinancialType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function roundPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(1));
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

dashboardRouter.get('/', asyncHandler(async (req, res) => {
  const companyId = req.auth!.companyId;
  const now = new Date();

  const selectedMonth = clampNumber(req.query.month, now.getMonth() + 1, 1, 12);
  const selectedYear = clampNumber(req.query.year, now.getFullYear(), now.getFullYear() - 6, now.getFullYear() + 2);

  const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const selectedMonthEnd = new Date(selectedYear, selectedMonth, 1);
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear + 1, 0, 1);
  const todayStart = startOfToday();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [financialEntries, selectedFinancialEntries, todayAppointments, criticalProducts, clientsCount, quotesCount] = await Promise.all([
    prisma.financialEntry.findMany({
      where: {
        companyId,
        createdAt: { gte: yearStart, lt: yearEnd },
        status: { not: FinancialStatus.CANCELLED }
      },
      select: { type: true, amountCents: true, createdAt: true }
    }),
    prisma.financialEntry.findMany({
      where: {
        companyId,
        createdAt: { gte: selectedMonthStart, lt: selectedMonthEnd },
        status: { not: FinancialStatus.CANCELLED }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        description: true,
        category: true,
        amountCents: true,
        status: true,
        paymentMethod: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
        notes: true
      }
    }),
    prisma.appointment.findMany({
      where: {
        companyId,
        startsAt: { gte: todayStart, lt: todayEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] }
      },
      orderBy: { startsAt: 'asc' },
      take: 6,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
        vehicle: { select: { id: true, model: true, plate: true } }
      }
    }),
    prisma.product.findMany({ where: { companyId, isActive: true }, orderBy: { name: 'asc' }, take: 100 }),
    prisma.client.count({ where: { companyId, isActive: true } }),
    prisma.quote.count({ where: { companyId } })
  ]);

  const monthlyFinancial = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    revenueCents: 0,
    expenseCents: 0,
    grossProfitCents: 0,
    netProfitCents: 0,
    growthPct: 0
  }));

  for (const entry of financialEntries) {
    const monthIndex = entry.createdAt.getMonth();
    if (entry.type === FinancialType.REVENUE) monthlyFinancial[monthIndex].revenueCents += entry.amountCents;
    if (entry.type === FinancialType.EXPENSE) monthlyFinancial[monthIndex].expenseCents += entry.amountCents;
  }

  for (let index = 0; index < monthlyFinancial.length; index += 1) {
    const item = monthlyFinancial[index];
    item.grossProfitCents = item.revenueCents;
    item.netProfitCents = item.revenueCents - item.expenseCents;
    item.growthPct = roundPct(pctChange(item.revenueCents, monthlyFinancial[index - 1]?.revenueCents ?? 0));
  }

  const selected = monthlyFinancial[selectedMonth - 1];
  const previous = monthlyFinancial[selectedMonth - 2] ?? null;
  const monthlyGrowthPct = previous ? roundPct(pctChange(selected.revenueCents, previous.revenueCents)) : selected.growthPct;
  const yearToDate = monthlyFinancial.slice(0, selectedMonth).reduce((acc, item) => {
    acc.revenueCents += item.revenueCents;
    acc.expenseCents += item.expenseCents;
    acc.netProfitCents += item.netProfitCents;
    return acc;
  }, { revenueCents: 0, expenseCents: 0, netProfitCents: 0 });

  const growthSamples = monthlyFinancial
    .slice(1, selectedMonth)
    .map((item, index) => pctChange(item.revenueCents, monthlyFinancial[index].revenueCents))
    .filter((value) => Number.isFinite(value));
  const averageGrowthPct = growthSamples.length
    ? roundPct(growthSamples.reduce((sum, value) => sum + value, 0) / growthSamples.length)
    : 0;
  const projectedGrowthPct = Math.max(Math.min(averageGrowthPct, 100), -50);
  const averageExpenseCents = Math.round(yearToDate.expenseCents / Math.max(selectedMonth, 1));
  const projectedNextRevenueCents = Math.max(0, Math.round(selected.revenueCents * (1 + projectedGrowthPct / 100)));
  const projectedNextExpenseCents = selected.expenseCents > 0 ? Math.round((selected.expenseCents + averageExpenseCents) / 2) : averageExpenseCents;
  const projectedNextNetProfitCents = projectedNextRevenueCents - projectedNextExpenseCents;

  const stockInsights = criticalProducts
    .map((product) => {
      const stockQuantity = Number(product.stockQuantity);
      const minStock = Number(product.minStock);
      const deficit = Math.max(0, minStock - stockQuantity);
      const status = minStock > 0 && stockQuantity <= minStock
        ? 'critical'
        : minStock > 0 && stockQuantity <= minStock * 1.35
          ? 'warning'
          : 'healthy';

      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        type: product.type,
        shade: product.shade,
        unit: product.unit,
        stockQuantity,
        minStock,
        deficit,
        status
      };
    })
    .filter((product) => product.status !== 'healthy')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'critical' ? -1 : 1;
      return a.stockQuantity - b.stockQuantity;
    });

  const stockCritical = stockInsights.filter((product) => product.status === 'critical').slice(0, 8);
  const stockWarning = stockInsights.filter((product) => product.status === 'warning').slice(0, 8);
  const marginPct = selected.revenueCents > 0 ? roundPct((selected.netProfitCents / selected.revenueCents) * 100) : 0;

  const categoryMap = new Map<string, { type: FinancialType; category: string; totalCents: number; count: number }>();
  for (const entry of selectedFinancialEntries) {
    const key = `${entry.type}:${entry.category}`;
    const current = categoryMap.get(key) ?? { type: entry.type, category: entry.category, totalCents: 0, count: 0 };
    current.totalCents += entry.amountCents;
    current.count += 1;
    categoryMap.set(key, current);
  }
  const financialCategories = Array.from(categoryMap.values())
    .map((category) => ({ ...category, type: category.type === FinancialType.REVENUE ? 'REVENUE' : 'EXPENSE' }))
    .sort((a, b) => b.totalCents - a.totalCents);

  const insights = [
    selected.netProfitCents >= 0
      ? {
          severity: 'success',
          title: 'Resultado positivo no mês',
          message: `Margem líquida estimada de ${marginPct}% no período filtrado.`
        }
      : {
          severity: 'danger',
          title: 'Atenção ao caixa do mês',
          message: 'As despesas superaram as receitas no período selecionado.'
        },
    monthlyGrowthPct >= 0
      ? {
          severity: 'success',
          title: 'Crescimento mensal',
          message: `Receita ${monthlyGrowthPct}% acima do mês anterior.`
        }
      : {
          severity: 'warning',
          title: 'Queda mensal',
          message: `Receita ${Math.abs(monthlyGrowthPct)}% abaixo do mês anterior.`
        },
    stockCritical.length > 0
      ? {
          severity: 'danger',
          title: 'Estoque crítico',
          message: `${stockCritical.length} produto(s) no limite ou abaixo do mínimo.`
        }
      : stockWarning.length > 0
        ? {
            severity: 'warning',
            title: 'Estoque em atenção',
            message: `${stockWarning.length} produto(s) perto do mínimo definido.`
          }
        : {
            severity: 'success',
            title: 'Estoque saudável',
            message: 'Nenhum produto ativo está abaixo ou próximo do mínimo.'
          }
  ];

  res.json({
    filters: {
      month: selectedMonth,
      year: selectedYear,
      monthLabel: `${MONTH_LABELS[selectedMonth - 1]}/${selectedYear}`,
      periodStart: selectedMonthStart.toISOString(),
      periodEnd: selectedMonthEnd.toISOString()
    },
    metrics: {
      revenueCents: selected.revenueCents,
      grossProfitCents: selected.grossProfitCents,
      expenseCents: selected.expenseCents,
      netProfitCents: selected.netProfitCents,
      profitCents: selected.netProfitCents,
      balanceCents: selected.netProfitCents,
      marginPct,
      monthlyGrowthPct,
      averageGrowthPct,
      projectedNextRevenueCents,
      projectedNextExpenseCents,
      projectedNextNetProfitCents,
      todayAppointments: todayAppointments.length,
      stockCriticalCount: stockCritical.length,
      stockWarningCount: stockWarning.length,
      clientsCount,
      quotesCount,
      yearToDate
    },
    monthlyFinancial,
    financialEntries: selectedFinancialEntries.map((entry) => ({
      ...entry,
      type: entry.type === FinancialType.REVENUE ? 'REVENUE' : 'EXPENSE'
    })),
    financialCategories,
    appointmentsToday: todayAppointments,
    stockCritical,
    stockWarning,
    insights
  });
}));
