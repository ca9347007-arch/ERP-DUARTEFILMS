import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  ReceiptText,
  RefreshCw,
  Sparkles,
  TrendingUp,
  WalletCards,
  X
} from 'lucide-react';
import { api, money } from '../api/client';

type MonthlyFinancial = {
  month: number;
  label: string;
  revenueCents: number;
  expenseCents: number;
  grossProfitCents: number;
  netProfitCents: number;
  growthPct: number;
};

type FinancialEntry = {
  id: string;
  type: 'REVENUE' | 'EXPENSE';
  description: string;
  category: string;
  amountCents: number;
  status: string;
  paymentMethod?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
  notes?: string | null;
};

type FinancialCategory = {
  type: 'REVENUE' | 'EXPENSE';
  category: string;
  totalCents: number;
  count: number;
};

type StockInsight = {
  id: string;
  name: string;
  brand?: string | null;
  type?: string | null;
  shade?: string | null;
  unit: string;
  stockQuantity: number;
  minStock: number;
  deficit: number;
  status: 'critical' | 'warning' | 'healthy';
};

type AppointmentToday = {
  id: string;
  startsAt: string;
  status: string;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string };
  vehicle?: { id: string; model: string; plate?: string | null } | null;
};

type DashboardData = {
  filters: {
    month: number;
    year: number;
    monthLabel: string;
  };
  metrics: {
    revenueCents: number;
    grossProfitCents: number;
    expenseCents: number;
    netProfitCents: number;
    balanceCents: number;
    marginPct: number;
    monthlyGrowthPct: number;
    averageGrowthPct: number;
    projectedNextRevenueCents: number;
    projectedNextExpenseCents: number;
    projectedNextNetProfitCents: number;
    todayAppointments: number;
    stockCriticalCount: number;
    stockWarningCount: number;
    clientsCount: number;
    quotesCount: number;
    yearToDate: {
      revenueCents: number;
      expenseCents: number;
      netProfitCents: number;
    };
  };
  monthlyFinancial: MonthlyFinancial[];
  financialEntries: FinancialEntry[];
  financialCategories: FinancialCategory[];
  appointmentsToday: AppointmentToday[];
  stockCritical: StockInsight[];
  stockWarning: StockInsight[];
  insights: Array<{ severity: 'success' | 'warning' | 'danger'; title: string; message: string }>;
};

type DrawerMode = 'revenue' | 'expenses' | 'profit' | null;

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

function pct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%`;
}

function date(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

function time(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function compactMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: Math.abs(cents) >= 10000000 ? 'compact' : 'standard',
    maximumFractionDigits: 0
  }).format(cents / 100);
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
    NO_SHOW: 'Não compareceu'
  };
  return labels[status] ?? status;
}

function MetricCard({
  label,
  value,
  helper,
  tone = 'default',
  icon: Icon,
  onClick
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'default' | 'success' | 'danger' | 'warning';
  icon: typeof WalletCards;
  onClick?: () => void;
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <div
      className={`kpiCard ${onClick ? 'clickable' : ''} tone-${tone}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={onClick ? `${label}. Abrir detalhamento.` : label}
    >
      <div className="metricIcon"><Icon size={19} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
      {onClick && <em className="cardClickHint">Ver detalhes</em>}
    </div>
  );
}

function FinancialAreaChart({ data, selectedMonth, onSelectMonth }: { data: MonthlyFinancial[]; selectedMonth: number; onSelectMonth: (month: number) => void }) {
  const maxValue = Math.max(1, ...data.map((item) => item.revenueCents));
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
    const y = 94 - (item.revenueCents / maxValue) * 74;
    return { ...item, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <div className="areaChart" aria-label="Receita anual em gráfico de área">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBF5B7" stopOpacity="0.36" />
            <stop offset="55%" stopColor="#D4AF37" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#BF953F" />
            <stop offset="35%" stopColor="#FCF6BA" />
            <stop offset="70%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#AA771C" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#goldArea)" />
        <path d={linePath} fill="none" stroke="url(#goldStroke)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="areaChartGrid">
        {points.map((point) => (
          <button
            type="button"
            className={`areaMonth ${point.month === selectedMonth ? 'active' : ''}`}
            key={point.month}
            title={`${point.label}: ${money(point.revenueCents)} em receitas`}
            onClick={() => onSelectMonth(point.month)}
          >
            <span>{point.label}</span>
            <strong>{compactMoney(point.revenueCents)}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function DrawerContent({ mode, data }: { mode: DrawerMode; data: DashboardData }) {
  const revenueEntries = data.financialEntries.filter((entry) => entry.type === 'REVENUE');
  const expenseEntries = data.financialEntries.filter((entry) => entry.type === 'EXPENSE');
  const expenseCategories = data.financialCategories.filter((category) => category.type === 'EXPENSE');
  const revenueCategories = data.financialCategories.filter((category) => category.type === 'REVENUE');

  if (mode === 'revenue') {
    return (
      <>
        <div className="drawerHero successHero">
          <span>Receitas do período</span>
          <strong>{money(data.metrics.revenueCents)}</strong>
          <small>{revenueEntries.length} lançamento(s) em {data.filters.monthLabel}</small>
        </div>

        <div className="drawerSection">
          <h3>Entradas por categoria</h3>
          {revenueCategories.length === 0 && <p className="mutedLine">Nenhuma categoria de receita registrada no mês.</p>}
          {revenueCategories.map((category) => (
            <div className="drawerCategory" key={category.category}>
              <span>{category.category}</span>
              <strong>{money(category.totalCents)}</strong>
              <small>{category.count} lançamento(s)</small>
            </div>
          ))}
        </div>

        <div className="drawerSection">
          <h3>Extrato de entradas</h3>
          {revenueEntries.length === 0 && <p className="mutedLine">Nenhuma entrada registrada neste mês.</p>}
          {revenueEntries.map((entry) => <FinancialLine entry={entry} key={entry.id} />)}
        </div>
      </>
    );
  }

  if (mode === 'expenses') {
    return (
      <>
        <div className="drawerHero dangerHero">
          <span>Gastos do período</span>
          <strong>{money(data.metrics.expenseCents)}</strong>
          <small>{expenseEntries.length} lançamento(s) em {data.filters.monthLabel}</small>
        </div>

        <div className="drawerSection">
          <h3>Despesas por categoria</h3>
          {expenseCategories.length === 0 && <p className="mutedLine">Nenhuma categoria de despesa registrada no mês.</p>}
          {expenseCategories.map((category) => (
            <div className="drawerCategory" key={category.category}>
              <span>{category.category}</span>
              <strong>{money(category.totalCents)}</strong>
              <small>{category.count} lançamento(s)</small>
            </div>
          ))}
        </div>

        <div className="drawerSection">
          <h3>Extrato de saídas</h3>
          {expenseEntries.length === 0 && <p className="mutedLine">Nenhuma despesa registrada neste mês.</p>}
          {expenseEntries.map((entry) => <FinancialLine entry={entry} key={entry.id} />)}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`drawerHero ${data.metrics.netProfitCents >= 0 ? 'successHero' : 'dangerHero'}`}>
        <span>Lucro líquido estimado</span>
        <strong>{money(data.metrics.netProfitCents)}</strong>
        <small>Margem líquida {data.metrics.marginPct.toFixed(1).replace('.', ',')}%</small>
      </div>

      <div className="drawerBalance">
        <div>
          <span>Entrou</span>
          <strong>{money(data.metrics.revenueCents)}</strong>
        </div>
        <div>
          <span>Saiu</span>
          <strong>{money(data.metrics.expenseCents)}</strong>
        </div>
        <div>
          <span>Resultado</span>
          <strong>{money(data.metrics.netProfitCents)}</strong>
        </div>
      </div>

      <div className="drawerSection">
        <h3>Leitura gerencial</h3>
        {data.insights.map((insight) => (
          <div className={`insight ${insight.severity}`} key={insight.title}>
            <strong>{insight.title}</strong>
            <p>{insight.message}</p>
          </div>
        ))}
      </div>

      <div className="drawerSection">
        <h3>Resumo para consultoria</h3>
        <p className="mutedLine">
          O painel cruza receitas, despesas, margem, projeção de crescimento, agenda do dia e estoque crítico.
          Use a exportação em PDF para apresentação e Excel para análise operacional/contábil.
        </p>
      </div>
    </>
  );
}

function FinancialLine({ entry }: { entry: FinancialEntry }) {
  const positive = entry.type === 'REVENUE';
  return (
    <div className={`financialLine ${positive ? 'positive' : 'negative'}`}>
      <div>
        <strong>{entry.description}</strong>
        <span>{entry.category} • {date(entry.createdAt)} • {statusLabel(entry.status)}</span>
        {entry.notes && <small>{entry.notes}</small>}
      </div>
      <b>{positive ? '+' : '-'} {money(entry.amountCents)}</b>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => current - 4 + index);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');

    api.get<DashboardData>('/dashboard', { params: { month, year } })
      .then((res) => setData(res.data))
      .catch(() => setError('Não foi possível carregar o dashboard agora.'))
      .finally(() => setLoading(false));
  }, [month, year]);

  async function exportReport(format: 'pdf' | 'xlsx') {
    try {
      setExporting(format);
      const response = await api.get(`/reports/dashboard.${format}`, {
        params: { month, year },
        responseType: 'blob'
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `duartefilms-dashboard-${year}-${String(month).padStart(2, '0')}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Não foi possível exportar o relatório agora.');
    } finally {
      setExporting(null);
    }
  }

  const selectedMonthName = MONTHS.find((item) => item.value === month)?.label ?? 'Mês';
  const metrics = data?.metrics;

  return (
    <section className="premiumDash">
      <div className="pageHeader dashboardHeader">
        <div>
          <span className="eyebrow">Visão geral inteligente</span>
          <h1>Dashboard financeiro e operacional</h1>
          <p>Lucro bruto, lucro líquido, gastos, crescimento, agenda do dia e estoque crítico em tempo real.</p>
        </div>

        <div className="dashActions">
          <div className="exportActions" aria-label="Exportações do dashboard">
            <button className="goldButton exportButton" type="button" onClick={() => exportReport('pdf')} disabled={!!exporting}>
              <FileText size={16} /> {exporting === 'pdf' ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
            <button className="ghostButton exportButton" type="button" onClick={() => exportReport('xlsx')} disabled={!!exporting}>
              <FileSpreadsheet size={16} /> {exporting === 'xlsx' ? 'Gerando Excel...' : 'Exportar Excel'}
            </button>
          </div>

          <div className="dashFilters">
            <label>
              Mês
              <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                {MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>
              Ano
              <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {years.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading && <div className="dashboardSkeleton">Atualizando dados do painel...</div>}

      {!loading && data && metrics && (
        <>
          <div className="kpiGrid">
            <MetricCard
              icon={WalletCards}
              label={`Lucro bruto / receita - ${selectedMonthName}`}
              value={money(metrics.grossProfitCents)}
              helper={`${pct(metrics.monthlyGrowthPct)} vs. mês anterior • clique para detalhar`}
              tone={metrics.monthlyGrowthPct >= 0 ? 'success' : 'warning'}
              onClick={() => setDrawer('revenue')}
            />
            <MetricCard
              icon={ArrowDownRight}
              label="Gastos do mês"
              value={money(metrics.expenseCents)}
              helper="Despesas registradas no financeiro • clique para detalhar"
              tone={metrics.expenseCents > metrics.grossProfitCents ? 'danger' : 'default'}
              onClick={() => setDrawer('expenses')}
            />
            <MetricCard
              icon={TrendingUp}
              label="Lucro líquido estimado"
              value={money(metrics.netProfitCents)}
              helper={`Margem ${metrics.marginPct.toFixed(1).replace('.', ',')}% • clique para balanço`}
              tone={metrics.netProfitCents >= 0 ? 'success' : 'danger'}
              onClick={() => setDrawer('profit')}
            />
            <MetricCard
              icon={CalendarDays}
              label="Clientes agendados hoje"
              value={metrics.todayAppointments}
              helper="Clique para abrir a agenda"
              tone="default"
              onClick={() => navigate('/agenda')}
            />
          </div>

          <div className="dashMainGrid v2DashGrid">
            <div className="card financeChartCard premiumAreaCard">
              <div className="cardTitleRow">
                <div>
                  <span className="eyebrow">Balanço financeiro</span>
                  <h2>{data.filters.monthLabel}</h2>
                </div>
                <span className={`deltaBadge ${metrics.balanceCents >= 0 ? 'positive' : 'negative'}`}>
                  {metrics.balanceCents >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {money(metrics.balanceCents)}
                </span>
              </div>

              <div className="balanceStrip">
                <button type="button" onClick={() => setDrawer('revenue')}><span>Entradas</span><strong>{money(metrics.revenueCents)}</strong></button>
                <button type="button" onClick={() => setDrawer('expenses')}><span>Saídas</span><strong>{money(metrics.expenseCents)}</strong></button>
                <button type="button" onClick={() => setDrawer('profit')}><span>Saldo</span><strong>{money(metrics.netProfitCents)}</strong></button>
              </div>

              <FinancialAreaChart data={data.monthlyFinancial} selectedMonth={month} onSelectMonth={setMonth} />

              <div className="chartLegend">
                <span><i className="legend revenue" /> Receita em área dourada</span>
                <span><i className="legend net" /> Detalhamento nos cards clicáveis</span>
                <span><i className="legend expense" /> Exportação PDF/Excel</span>
              </div>
            </div>

            <div className="card projectionCard">
              <div className="cardTitleRow">
                <div>
                  <span className="eyebrow">Projeção de crescimento</span>
                  <h2>Próximo mês</h2>
                </div>
                <Sparkles size={24} />
              </div>

              <div className="projectionValue">
                <strong>{money(metrics.projectedNextRevenueCents)}</strong>
                <span>Receita projetada baseada na média de crescimento do ano</span>
              </div>

              <div className="growthPanel">
                <div>
                  <span>Crescimento médio</span>
                  <strong>{pct(metrics.averageGrowthPct)}</strong>
                </div>
                <div>
                  <span>Lucro projetado</span>
                  <strong>{money(metrics.projectedNextNetProfitCents)}</strong>
                </div>
              </div>

              <div className="smartNote">
                <RefreshCw size={16} />
                O painel vira o mês automaticamente porque a API usa o mês atual quando nenhum filtro é enviado. Os filtros servem para análise histórica.
              </div>
            </div>
          </div>

          <div className="dashBottomGrid">
            <div className="card stockCard">
              <div className="cardTitleRow">
                <div>
                  <span className="eyebrow">Estoque inteligente</span>
                  <h2>Produtos para atenção</h2>
                </div>
                <Package size={24} />
              </div>

              {!data.stockCritical.length && !data.stockWarning.length && (
                <div className="emptyState">
                  <Package size={34} />
                  <strong>Estoque saudável</strong>
                  <p>Nenhum produto ativo está no limite mínimo ou próximo dele.</p>
                </div>
              )}

              {[...data.stockCritical, ...data.stockWarning].map((product) => (
                <div className={`stockItem ${product.status}`} key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{[product.brand, product.type, product.shade].filter(Boolean).join(' • ') || 'Produto cadastrado'}</span>
                  </div>
                  <div>
                    <b>{product.stockQuantity} {product.unit}</b>
                    <small>Mín.: {product.minStock} {product.unit}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="card agendaCard">
              <div className="cardTitleRow">
                <div>
                  <span className="eyebrow">Agenda de hoje</span>
                  <h2>{metrics.todayAppointments} cliente(s)</h2>
                </div>
                <button className="miniButton" type="button" onClick={() => navigate('/agenda')}>Abrir agenda</button>
              </div>

              {!data.appointmentsToday.length && (
                <div className="emptyState compactEmpty">
                  <CalendarDays size={30} />
                  <strong>Sem agenda para hoje</strong>
                  <p>Quando houver agendamento, ele aparece aqui.</p>
                </div>
              )}

              {data.appointmentsToday.map((appointment) => (
                <button className="appointmentItem" type="button" key={appointment.id} onClick={() => navigate('/agenda')}>
                  <span>{time(appointment.startsAt)}</span>
                  <strong>{appointment.client.name}</strong>
                  <small>{appointment.service.name}{appointment.vehicle?.model ? ` • ${appointment.vehicle.model}` : ''}</small>
                </button>
              ))}
            </div>

            <div className="card insightsCard">
              <div className="cardTitleRow">
                <div>
                  <span className="eyebrow">Insights automáticos</span>
                  <h2>Leitura do mês</h2>
                </div>
                <AlertTriangle size={24} />
              </div>

              {data.insights.map((insight) => (
                <div className={`insight ${insight.severity}`} key={insight.title}>
                  <strong>{insight.title}</strong>
                  <p>{insight.message}</p>
                </div>
              ))}

              <div className="yearSummary">
                <span>Acumulado do ano</span>
                <strong>{compactMoney(metrics.yearToDate.netProfitCents)}</strong>
                <small>Receita {compactMoney(metrics.yearToDate.revenueCents)} • Gastos {compactMoney(metrics.yearToDate.expenseCents)}</small>
              </div>
            </div>
          </div>

          {drawer && (
            <div className="drawerBackdrop" role="presentation" onClick={() => setDrawer(null)}>
              <aside className="smartDrawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                <div className="drawerHeader">
                  <div>
                    <span className="eyebrow">Detalhamento dinâmico</span>
                    <h2>
                      {drawer === 'revenue' && 'Receitas do mês'}
                      {drawer === 'expenses' && 'Gastos do mês'}
                      {drawer === 'profit' && 'Balanço líquido'}
                    </h2>
                  </div>
                  <button type="button" className="iconButton" onClick={() => setDrawer(null)} aria-label="Fechar gaveta">
                    <X size={18} />
                  </button>
                </div>

                <DrawerContent mode={drawer} data={data} />

                <div className="drawerFooter">
                  <button type="button" className="ghostButton" onClick={() => navigate('/financeiro')}>
                    <ReceiptText size={16} /> Abrir financeiro
                  </button>
                  <button type="button" className="goldButton" onClick={() => exportReport(drawer === 'expenses' ? 'xlsx' : 'pdf')}>
                    <Download size={16} /> Exportar análise
                  </button>
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </section>
  );
}
