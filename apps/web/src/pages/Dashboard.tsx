import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Package,
  RefreshCw,
  Sparkles,
  TrendingUp,
  WalletCards
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
  appointmentsToday: AppointmentToday[];
  stockCritical: StockInsight[];
  stockWarning: StockInsight[];
  insights: Array<{ severity: 'success' | 'warning' | 'danger'; title: string; message: string }>;
};

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
  const Content = (
    <>
      <div className="metricIcon"><Icon size={19} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`kpiCard clickable tone-${tone}`} onClick={onClick}>
        {Content}
      </button>
    );
  }

  return <div className={`kpiCard tone-${tone}`}>{Content}</div>;
}

export function Dashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const maxChartValue = useMemo(() => {
    const values = data?.monthlyFinancial.flatMap((item) => [item.revenueCents, item.expenseCents, Math.abs(item.netProfitCents)]) ?? [1];
    return Math.max(1, ...values);
  }, [data]);

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

      {error && <div className="alert">{error}</div>}
      {loading && <div className="dashboardSkeleton">Atualizando dados do painel...</div>}

      {!loading && data && metrics && (
        <>
          <div className="kpiGrid">
            <MetricCard
              icon={WalletCards}
              label={`Lucro bruto / receita - ${selectedMonthName}`}
              value={money(metrics.grossProfitCents)}
              helper={`${pct(metrics.monthlyGrowthPct)} vs. mês anterior`}
              tone={metrics.monthlyGrowthPct >= 0 ? 'success' : 'warning'}
            />
            <MetricCard
              icon={ArrowDownRight}
              label="Gastos do mês"
              value={money(metrics.expenseCents)}
              helper="Despesas registradas no financeiro"
              tone={metrics.expenseCents > metrics.grossProfitCents ? 'danger' : 'default'}
            />
            <MetricCard
              icon={TrendingUp}
              label="Lucro líquido estimado"
              value={money(metrics.netProfitCents)}
              helper={`Margem ${metrics.marginPct.toFixed(1).replace('.', ',')}%`}
              tone={metrics.netProfitCents >= 0 ? 'success' : 'danger'}
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

          <div className="dashMainGrid">
            <div className="card financeChartCard">
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
                <div><span>Entradas</span><strong>{money(metrics.revenueCents)}</strong></div>
                <div><span>Saídas</span><strong>{money(metrics.expenseCents)}</strong></div>
                <div><span>Saldo</span><strong>{money(metrics.netProfitCents)}</strong></div>
              </div>

              <div className="barChart" aria-label="Receitas, despesas e lucro líquido mês a mês">
                {data.monthlyFinancial.map((item) => (
                  <div className={`barMonth ${item.month === month ? 'active' : ''}`} key={item.month} title={`${item.label}: receita ${money(item.revenueCents)}, despesa ${money(item.expenseCents)}`}>
                    <div className="barStack">
                      <span className="bar revenue" style={{ height: `${Math.max(4, (item.revenueCents / maxChartValue) * 120)}px` }} />
                      <span className="bar expense" style={{ height: `${Math.max(4, (item.expenseCents / maxChartValue) * 120)}px` }} />
                      <span className={`bar net ${item.netProfitCents < 0 ? 'negative' : ''}`} style={{ height: `${Math.max(4, (Math.abs(item.netProfitCents) / maxChartValue) * 120)}px` }} />
                    </div>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>

              <div className="chartLegend">
                <span><i className="legend revenue" /> Receita</span>
                <span><i className="legend expense" /> Gastos</span>
                <span><i className="legend net" /> Lucro líquido</span>
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
        </>
      )}
    </section>
  );
}
