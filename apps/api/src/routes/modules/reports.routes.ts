import { Router } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AppointmentStatus, FinancialStatus, FinancialType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function cents(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}

function brDate(value?: Date | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(value);
}

function brDateTime(value?: Date | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(value);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    RECEIVED: 'Recebido',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado',
    CONFIRMED: 'Confirmado',
    IN_SERVICE: 'Em atendimento',
    FINISHED: 'Finalizado',
    NO_SHOW: 'Não compareceu',
    DRAFT: 'Rascunho',
    SENT: 'Enviado',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    EXPIRED: 'Expirado'
  };
  return labels[status] ?? status;
}

async function getDashboardReportData(companyId: string, month: number, year: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const [company, financialEntries, yearlyFinancialEntries, appointments, products, quotes] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.financialEntry.findMany({
      where: {
        companyId,
        createdAt: { gte: monthStart, lt: monthEnd },
        status: { not: FinancialStatus.CANCELLED }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.financialEntry.findMany({
      where: {
        companyId,
        createdAt: { gte: yearStart, lt: yearEnd },
        status: { not: FinancialStatus.CANCELLED }
      },
      select: { type: true, amountCents: true, createdAt: true }
    }),
    prisma.appointment.findMany({
      where: {
        companyId,
        startsAt: { gte: monthStart, lt: monthEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] }
      },
      orderBy: { startsAt: 'asc' },
      include: {
        client: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        vehicle: { select: { model: true, plate: true } }
      }
    }),
    prisma.product.findMany({ where: { companyId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.quote.findMany({
      where: { companyId, createdAt: { gte: monthStart, lt: monthEnd } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { client: { select: { name: true } } }
    })
  ]);

  const revenueCents = financialEntries
    .filter((entry) => entry.type === FinancialType.REVENUE)
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const expenseCents = financialEntries
    .filter((entry) => entry.type === FinancialType.EXPENSE)
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const netProfitCents = revenueCents - expenseCents;
  const marginPct = revenueCents > 0 ? Number(((netProfitCents / revenueCents) * 100).toFixed(1)) : 0;

  const monthlyFinancial = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    revenueCents: 0,
    expenseCents: 0,
    netProfitCents: 0
  }));

  for (const entry of yearlyFinancialEntries) {
    const monthIndex = entry.createdAt.getMonth();
    if (entry.type === FinancialType.REVENUE) monthlyFinancial[monthIndex].revenueCents += entry.amountCents;
    if (entry.type === FinancialType.EXPENSE) monthlyFinancial[monthIndex].expenseCents += entry.amountCents;
  }

  for (const item of monthlyFinancial) {
    item.netProfitCents = item.revenueCents - item.expenseCents;
  }

  const stockAlerts = products
    .map((product) => {
      const stockQuantity = Number(product.stockQuantity);
      const minStock = Number(product.minStock);
      const status = minStock > 0 && stockQuantity <= minStock
        ? 'Crítico'
        : minStock > 0 && stockQuantity <= minStock * 1.35
          ? 'Atenção'
          : 'Saudável';
      return {
        name: product.name,
        brand: product.brand,
        type: product.type,
        shade: product.shade,
        unit: product.unit,
        stockQuantity,
        minStock,
        status
      };
    })
    .filter((product) => product.status !== 'Saudável')
    .sort((a, b) => a.stockQuantity - b.stockQuantity);

  const categories = new Map<string, { type: FinancialType; category: string; totalCents: number; count: number }>();
  for (const entry of financialEntries) {
    const key = `${entry.type}:${entry.category}`;
    const current = categories.get(key) ?? { type: entry.type, category: entry.category, totalCents: 0, count: 0 };
    current.totalCents += entry.amountCents;
    current.count += 1;
    categories.set(key, current);
  }

  return {
    company,
    month,
    year,
    monthLabel: `${MONTH_LABELS[month - 1]}/${year}`,
    period: { monthStart, monthEnd },
    metrics: { revenueCents, expenseCents, netProfitCents, marginPct },
    financialEntries,
    financialCategories: Array.from(categories.values()).sort((a, b) => b.totalCents - a.totalCents),
    monthlyFinancial,
    appointments,
    stockAlerts,
    quotes
  };
}

reportsRouter.get('/financial-summary', asyncHandler(async (req, res) => {
  const companyId = req.auth!.companyId;
  const revenue = await prisma.financialEntry.aggregate({ where: { companyId, type: FinancialType.REVENUE }, _sum: { amountCents: true } });
  const expense = await prisma.financialEntry.aggregate({ where: { companyId, type: FinancialType.EXPENSE }, _sum: { amountCents: true } });
  const revenueCents = revenue._sum.amountCents ?? 0;
  const expenseCents = expense._sum.amountCents ?? 0;
  res.json({ revenueCents, expenseCents, profitCents: revenueCents - expenseCents });
}));

reportsRouter.get('/dashboard.pdf', asyncHandler(async (req, res) => {
  const now = new Date();
  const month = clampNumber(req.query.month, now.getMonth() + 1, 1, 12);
  const year = clampNumber(req.query.year, now.getFullYear(), now.getFullYear() - 6, now.getFullYear() + 2);
  const report = await getDashboardReportData(req.auth!.companyId, month, year);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="duartefilms-dashboard-${year}-${String(month).padStart(2, '0')}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 42 });
  doc.pipe(res);

  doc.rect(0, 0, doc.page.width, 86).fill('#09090b');
  doc.fillColor('#D4AF37').fontSize(10).text('DUARTEFILMS ERP', 42, 28, { characterSpacing: 1.5 });
  doc.fillColor('#FFFFFF').fontSize(22).text('Relatório financeiro e operacional', 42, 44);
  doc.fillColor('#A1A1AA').fontSize(10).text(`Período: ${report.monthLabel} • Emitido em ${brDateTime(new Date())}`, 42, 70);

  doc.moveDown(3.8);
  doc.fillColor('#FFFFFF').fontSize(15).text('Resumo executivo', { underline: false });
  doc.moveDown(0.5);
  doc.fillColor('#D4AF37').fontSize(22).text(`${cents(report.metrics.netProfitCents)} de lucro líquido estimado`);
  doc.fillColor('#A1A1AA').fontSize(10).text(`Receitas: ${cents(report.metrics.revenueCents)} • Despesas: ${cents(report.metrics.expenseCents)} • Margem: ${report.metrics.marginPct}%`);

  doc.moveDown(1.2);
  doc.fillColor('#FFFFFF').fontSize(13).text('Balanço do mês');
  doc.moveDown(0.4);
  const balanceRows = [
    ['Receitas', cents(report.metrics.revenueCents)],
    ['Despesas', cents(report.metrics.expenseCents)],
    ['Lucro líquido', cents(report.metrics.netProfitCents)],
    ['Agenda do mês', `${report.appointments.length} atendimento(s)`],
    ['Estoque crítico/atenção', `${report.stockAlerts.length} produto(s)`],
    ['Orçamentos criados', `${report.quotes.length} orçamento(s)`]
  ];
  for (const [label, value] of balanceRows) {
    doc.fillColor('#A1A1AA').fontSize(10).text(label, { continued: true });
    doc.fillColor('#FFFFFF').text(`  ${value}`);
  }

  doc.moveDown(1.2);
  doc.fillColor('#FFFFFF').fontSize(13).text('Receitas e despesas registradas');
  doc.moveDown(0.4);
  if (report.financialEntries.length === 0) {
    doc.fillColor('#A1A1AA').fontSize(10).text('Nenhum lançamento financeiro registrado neste período.');
  }
  for (const entry of report.financialEntries.slice(0, 22)) {
    const signal = entry.type === FinancialType.REVENUE ? '+' : '-';
    doc.fillColor(entry.type === FinancialType.REVENUE ? '#86EFAC' : '#FCA5A5')
      .fontSize(10)
      .text(`${signal} ${cents(entry.amountCents)}  `, { continued: true });
    doc.fillColor('#FFFFFF').text(`${entry.description}  `, { continued: true });
    doc.fillColor('#A1A1AA').text(`• ${entry.category} • ${statusLabel(entry.status)} • ${brDate(entry.createdAt)}`);
  }

  doc.moveDown(1.2);
  doc.fillColor('#FFFFFF').fontSize(13).text('Estoque para atenção');
  doc.moveDown(0.4);
  if (report.stockAlerts.length === 0) {
    doc.fillColor('#A1A1AA').fontSize(10).text('Nenhum produto ativo abaixo ou próximo do estoque mínimo.');
  }
  for (const product of report.stockAlerts.slice(0, 14)) {
    doc.fillColor(product.status === 'Crítico' ? '#FCA5A5' : '#FDE68A').fontSize(10).text(`${product.status}: `, { continued: true });
    doc.fillColor('#FFFFFF').text(`${product.name} — ${product.stockQuantity} ${product.unit} / mínimo ${product.minStock} ${product.unit}`);
  }

  doc.moveDown(1.2);
  doc.fillColor('#FFFFFF').fontSize(13).text('Observação para consultoria/contabilidade');
  doc.moveDown(0.4);
  doc.fillColor('#A1A1AA').fontSize(10).text(
    'Este relatório consolida lançamentos financeiros, agenda, orçamentos e sinais de estoque para análise gerencial. Para contabilidade, validar documentos fiscais e comprovantes externos quando aplicável.',
    { lineGap: 3 }
  );

  doc.end();
}));

reportsRouter.get('/dashboard.xlsx', asyncHandler(async (req, res) => {
  const now = new Date();
  const month = clampNumber(req.query.month, now.getMonth() + 1, 1, 12);
  const year = clampNumber(req.query.year, now.getFullYear(), now.getFullYear() - 6, now.getFullYear() + 2);
  const report = await getDashboardReportData(req.auth!.companyId, month, year);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DuarteFilms ERP';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Resumo');
  summary.columns = [
    { header: 'Indicador', key: 'indicator', width: 34 },
    { header: 'Valor', key: 'value', width: 24 }
  ];
  summary.addRows([
    { indicator: 'Período', value: report.monthLabel },
    { indicator: 'Receitas', value: report.metrics.revenueCents / 100 },
    { indicator: 'Despesas', value: report.metrics.expenseCents / 100 },
    { indicator: 'Lucro líquido', value: report.metrics.netProfitCents / 100 },
    { indicator: 'Margem líquida (%)', value: report.metrics.marginPct },
    { indicator: 'Atendimentos no mês', value: report.appointments.length },
    { indicator: 'Produtos em atenção', value: report.stockAlerts.length },
    { indicator: 'Orçamentos criados', value: report.quotes.length }
  ]);
  summary.getRow(1).font = { bold: true };

  const entriesSheet = workbook.addWorksheet('Financeiro');
  entriesSheet.columns = [
    { header: 'Data', key: 'date', width: 16 },
    { header: 'Tipo', key: 'type', width: 14 },
    { header: 'Descrição', key: 'description', width: 36 },
    { header: 'Categoria', key: 'category', width: 20 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Vencimento', key: 'dueDate', width: 16 },
    { header: 'Pago/Recebido em', key: 'paidAt', width: 18 },
    { header: 'Valor', key: 'amount', width: 16 },
    { header: 'Observações', key: 'notes', width: 40 }
  ];
  entriesSheet.addRows(report.financialEntries.map((entry) => ({
    date: brDate(entry.createdAt),
    type: entry.type === FinancialType.REVENUE ? 'Receita' : 'Despesa',
    description: entry.description,
    category: entry.category,
    status: statusLabel(entry.status),
    dueDate: brDate(entry.dueDate),
    paidAt: brDate(entry.paidAt),
    amount: (entry.type === FinancialType.EXPENSE ? -entry.amountCents : entry.amountCents) / 100,
    notes: entry.notes ?? ''
  })));
  entriesSheet.getRow(1).font = { bold: true };

  const categoriesSheet = workbook.addWorksheet('Categorias');
  categoriesSheet.columns = [
    { header: 'Tipo', key: 'type', width: 14 },
    { header: 'Categoria', key: 'category', width: 28 },
    { header: 'Lançamentos', key: 'count', width: 14 },
    { header: 'Total', key: 'total', width: 16 }
  ];
  categoriesSheet.addRows(report.financialCategories.map((category) => ({
    type: category.type === FinancialType.REVENUE ? 'Receita' : 'Despesa',
    category: category.category,
    count: category.count,
    total: category.totalCents / 100
  })));
  categoriesSheet.getRow(1).font = { bold: true };

  const agendaSheet = workbook.addWorksheet('Agenda');
  agendaSheet.columns = [
    { header: 'Data/Hora', key: 'startsAt', width: 20 },
    { header: 'Cliente', key: 'client', width: 28 },
    { header: 'WhatsApp', key: 'phone', width: 18 },
    { header: 'Serviço', key: 'service', width: 30 },
    { header: 'Veículo', key: 'vehicle', width: 24 },
    { header: 'Status', key: 'status', width: 18 }
  ];
  agendaSheet.addRows(report.appointments.map((appointment) => ({
    startsAt: brDateTime(appointment.startsAt),
    client: appointment.client.name,
    phone: appointment.client.phone,
    service: appointment.service.name,
    vehicle: appointment.vehicle?.model ?? '',
    status: statusLabel(appointment.status)
  })));
  agendaSheet.getRow(1).font = { bold: true };

  const stockSheet = workbook.addWorksheet('Estoque atenção');
  stockSheet.columns = [
    { header: 'Produto', key: 'name', width: 34 },
    { header: 'Marca', key: 'brand', width: 18 },
    { header: 'Tipo', key: 'type', width: 18 },
    { header: 'Tonalidade', key: 'shade', width: 18 },
    { header: 'Estoque', key: 'stock', width: 14 },
    { header: 'Mínimo', key: 'min', width: 14 },
    { header: 'Unidade', key: 'unit', width: 12 },
    { header: 'Status', key: 'status', width: 16 }
  ];
  stockSheet.addRows(report.stockAlerts.map((product) => ({
    name: product.name,
    brand: product.brand ?? '',
    type: product.type ?? '',
    shade: product.shade ?? '',
    stock: product.stockQuantity,
    min: product.minStock,
    unit: product.unit,
    status: product.status
  })));
  stockSheet.getRow(1).font = { bold: true };

  const quotesSheet = workbook.addWorksheet('Orçamentos');
  quotesSheet.columns = [
    { header: 'Data', key: 'date', width: 16 },
    { header: 'Cliente', key: 'client', width: 28 },
    { header: 'Título', key: 'title', width: 36 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Subtotal', key: 'subtotal', width: 16 },
    { header: 'Desconto', key: 'discount', width: 16 },
    { header: 'Total', key: 'total', width: 16 }
  ];
  quotesSheet.addRows(report.quotes.map((quote) => ({
    date: brDate(quote.createdAt),
    client: quote.client.name,
    title: quote.title,
    status: statusLabel(quote.status),
    subtotal: quote.subtotalCents / 100,
    discount: quote.discountCents / 100,
    total: quote.totalCents / 100
  })));
  quotesSheet.getRow(1).font = { bold: true };

  for (const worksheet of workbook.worksheets) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="duartefilms-dashboard-${year}-${String(month).padStart(2, '0')}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}));
