import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, DollarSign, Edit3, Filter, Plus, Search, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { api, money } from '../api/client';
import { FinancialEntry } from '../types';

type FinancialSummary = {
  cashBalanceCents: number;
  monthRevenueCents: number;
  monthExpenseCents: number;
  payableCents: number;
  receivableCents: number;
  netMonthCents: number;
};

type FinancialResponse = {
  entries: FinancialEntry[];
  summary?: FinancialSummary;
};

type EntryForm = {
  id?: string;
  type: 'REVENUE' | 'EXPENSE';
  description: string;
  category: string;
  amountReais: string;
  paymentMethod: 'PIX_MANUAL' | 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  status: 'PENDING' | 'RECEIVED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paidAt: string;
  notes: string;
};

const emptyForm: EntryForm = {
  type: 'REVENUE',
  description: '',
  category: '',
  amountReais: '',
  paymentMethod: 'PIX_MANUAL',
  status: 'PENDING',
  dueDate: '',
  paidAt: '',
  notes: ''
};

function reaisToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100);
}

function centsToReaisInput(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function methodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    PIX_MANUAL: 'Pix manual',
    CASH: 'Dinheiro',
    CARD: 'Cartão',
    TRANSFER: 'Transferência',
    OTHER: 'Outro'
  };
  return labels[method || ''] || 'Não informado';
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    RECEIVED: 'Recebido',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado'
  };
  return labels[status || ''] || status || 'Pendente';
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function toInputDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function toDateTime(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T12:00:00`).toISOString();
}

export function Finance() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    cashBalanceCents: 0,
    monthRevenueCents: 0,
    monthExpenseCents: 0,
    payableCents: 0,
    receivableCents: 0,
    netMonthCents: 0
  });
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<'ALL' | 'REVENUE' | 'EXPENSE' | 'PAYABLE' | 'RECEIVABLE'>('ALL');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.get<FinancialResponse>('/financial-entries');
    setEntries(res.data.entries || []);
    if (res.data.summary) setSummary(res.data.summary);
  }

  useEffect(() => { load(); }, []);

  const filteredEntries = useMemo(() => {
    const term = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesTab =
        tab === 'ALL' ||
        (tab === 'REVENUE' && entry.type === 'REVENUE') ||
        (tab === 'EXPENSE' && entry.type === 'EXPENSE') ||
        (tab === 'PAYABLE' && entry.type === 'EXPENSE' && entry.status === 'PENDING') ||
        (tab === 'RECEIVABLE' && entry.type === 'REVENUE' && entry.status === 'PENDING');

      const matchesSearch = !term ||
        entry.description.toLowerCase().includes(term) ||
        entry.category.toLowerCase().includes(term) ||
        String(entry.status).toLowerCase().includes(term);

      return matchesTab && matchesSearch && entry.status !== 'CANCELLED';
    });
  }, [entries, query, tab]);

  function openNew(type: 'REVENUE' | 'EXPENSE' = 'REVENUE') {
    setForm({
      ...emptyForm,
      type,
      status: type === 'REVENUE' ? 'RECEIVED' : 'PENDING'
    });
    setDrawerOpen(true);
  }

  function openEdit(entry: FinancialEntry) {
    setForm({
      id: entry.id,
      type: entry.type,
      description: entry.description,
      category: entry.category,
      amountReais: centsToReaisInput(entry.amountCents),
      paymentMethod: (entry.paymentMethod as EntryForm['paymentMethod']) || 'PIX_MANUAL',
      status: (entry.status as EntryForm['status']) || 'PENDING',
      dueDate: toInputDate((entry as any).dueDate),
      paidAt: toInputDate((entry as any).paidAt),
      notes: ((entry as any).notes as string) || ''
    });
    setDrawerOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    const amountCents = reaisToCents(form.amountReais);
    if (amountCents <= 0) {
      window.alert('Informe um valor válido em reais.');
      return;
    }

    const payload = {
      type: form.type,
      description: form.description,
      category: form.category,
      amountCents,
      paymentMethod: form.paymentMethod,
      status: form.status,
      dueDate: toDateTime(form.dueDate),
      paidAt: toDateTime(form.paidAt),
      notes: form.notes || undefined
    };

    setSaving(true);
    try {
      if (form.id) {
        await api.patch(`/financial-entries/${form.id}`, payload);
      } else {
        await api.post('/financial-entries', payload);
      }

      setDrawerOpen(false);
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(entry: FinancialEntry, status: 'RECEIVED' | 'PAID' | 'PENDING' | 'CANCELLED') {
    await api.patch(`/financial-entries/${entry.id}`, {
      status,
      paidAt: status === 'RECEIVED' || status === 'PAID' ? new Date().toISOString() : null
    });
    await load();
  }

  return (
    <section className="financePage">
      <div className="pageHeader financeHeader">
        <div>
          <span className="eyebrow">Caixa</span>
          <h1>Controle Financeiro</h1>
          <p>Gerencie receitas, despesas, contas a pagar, contas a receber e saldo operacional.</p>
        </div>
        <button className="primaryAction" onClick={() => openNew('REVENUE')}>
          <Plus size={18} /> Novo lançamento
        </button>
      </div>

      <div className="financeSummaryGrid">
        <article className="financeSummaryCard highlight">
          <div className="financeCardHeader">
            <span>Saldo em caixa</span>
            <Wallet size={18} />
          </div>
          <strong>{money(summary.cashBalanceCents)}</strong>
          <small>Recebidos menos despesas pagas</small>
        </article>

        <article className="financeSummaryCard">
          <div className="financeCardHeader success">
            <span>Receitas do mês</span>
            <TrendingUp size={18} />
          </div>
          <strong>{money(summary.monthRevenueCents)}</strong>
          <small>Entradas registradas no período</small>
        </article>

        <article className="financeSummaryCard">
          <div className="financeCardHeader danger">
            <span>Despesas do mês</span>
            <TrendingDown size={18} />
          </div>
          <strong>{money(summary.monthExpenseCents)}</strong>
          <small>Saídas registradas no período</small>
        </article>

        <article className="financeSummaryCard">
          <div className="financeCardHeader warning">
            <span>A pagar</span>
            <CalendarDays size={18} />
          </div>
          <strong>{money(summary.payableCents)}</strong>
          <small>Despesas pendentes/agendadas</small>
        </article>
      </div>

      <div className="financeToolbar">
        <div className="financeTabs">
          <button className={tab === 'ALL' ? 'active' : ''} onClick={() => setTab('ALL')}>Todas</button>
          <button className={tab === 'REVENUE' ? 'active' : ''} onClick={() => setTab('REVENUE')}>Receitas</button>
          <button className={tab === 'EXPENSE' ? 'active' : ''} onClick={() => setTab('EXPENSE')}>Despesas</button>
          <button className={tab === 'PAYABLE' ? 'active' : ''} onClick={() => setTab('PAYABLE')}>Contas a pagar</button>
          <button className={tab === 'RECEIVABLE' ? 'active' : ''} onClick={() => setTab('RECEIVABLE')}>Contas a receber</button>
        </div>

        <div className="searchBox">
          <Search size={18} />
          <input
            placeholder="Pesquisar por descrição, categoria ou status"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="financeActionsRow">
        <button onClick={() => openNew('REVENUE')}><TrendingUp size={16} /> Receita rápida</button>
        <button onClick={() => openNew('EXPENSE')}><TrendingDown size={16} /> Despesa rápida</button>
        <span><Filter size={14} /> {filteredEntries.length} lançamento(s)</span>
      </div>

      <div className="transactionList">
        {filteredEntries.length === 0 && (
          <div className="emptyState">Nenhum lançamento financeiro encontrado.</div>
        )}

        {filteredEntries.map((entry) => {
          const isRevenue = entry.type === 'REVENUE';
          const dueDate = (entry as any).dueDate as string | null | undefined;

          return (
            <article className="transactionItemPremium" key={entry.id}>
              <div className={`txIconPremium ${isRevenue ? 'income' : 'expense'}`}>
                {isRevenue ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>

              <div className="txInfoPremium">
                <strong>{entry.description}</strong>
                <span>{entry.category} • {methodLabel(entry.paymentMethod)}</span>
                <small>{dueDate ? `Vence em ${formatDate(dueDate)}` : `Criado em ${formatDate(entry.createdAt)}`}</small>
              </div>

              <div className={`financeBadge ${entry.status?.toLowerCase()}`}>
                {statusLabel(entry.status)}
              </div>

              <strong className={`txAmountPremium ${isRevenue ? 'positive' : 'negative'}`}>
                {isRevenue ? '+' : '-'} {money(entry.amountCents)}
              </strong>

              <div className="txActionsPremium">
                {entry.status === 'PENDING' && (
                  <button onClick={() => quickStatus(entry, isRevenue ? 'RECEIVED' : 'PAID')}>
                    <CheckCircle2 size={15} /> Baixar
                  </button>
                )}
                <button onClick={() => openEdit(entry)}><Edit3 size={15} /> Editar</button>
                <button onClick={() => quickStatus(entry, 'CANCELLED')}><X size={15} /> Cancelar</button>
              </div>
            </article>
          );
        })}
      </div>

      {drawerOpen && (
        <div className="drawerBackdrop">
          <aside className="drawer financeDrawer">
            <button className="drawerClose" onClick={() => setDrawerOpen(false)}><X size={18} /></button>
            <span className="eyebrow">{form.id ? 'Editar lançamento' : 'Novo lançamento'}</span>
            <h2>{form.type === 'REVENUE' ? 'Receita' : 'Despesa'}</h2>
            <p>Informe os valores em reais. O sistema converte corretamente para centavos no banco.</p>

            <form className="financeFullForm quoteBuilderForm" onSubmit={submit}>
              <div className="drawerTwoColumns">
                <label>
                  Tipo
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EntryForm['type'], status: e.target.value === 'REVENUE' ? 'RECEIVED' : 'PENDING' })}>
                    <option value="REVENUE">Receita</option>
                    <option value="EXPENSE">Despesa</option>
                  </select>
                </label>

                <label>
                  Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EntryForm['status'] })}>
                    <option value="PENDING">Pendente</option>
                    <option value="RECEIVED">Recebido</option>
                    <option value="PAID">Pago</option>
                    <option value="OVERDUE">Vencido</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </label>
              </div>

              <label>
                Descrição
                <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Película automotiva completa" />
              </label>

              <div className="drawerTwoColumns">
                <label>
                  Categoria
                  <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Serviços, estoque, aluguel..." />
                </label>

                <label>
                  Valor em R$
                  <input required value={form.amountReais} onChange={(e) => setForm({ ...form, amountReais: e.target.value })} placeholder="Ex: 450,00" />
                </label>
              </div>

              <div className="drawerTwoColumns">
                <label>
                  Forma de pagamento
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as EntryForm['paymentMethod'] })}>
                    <option value="PIX_MANUAL">Pix manual</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="CARD">Cartão</option>
                    <option value="TRANSFER">Transferência</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </label>

                <label>
                  Vencimento
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </label>
              </div>

              <label>
                Data de pagamento/recebimento
                <input type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
              </label>

              <label>
                Observações
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Negociação, comprovante, fornecedor, cliente..." />
              </label>

              <div className="drawerActions">
                <button type="button" className="secondaryAction" onClick={() => setDrawerOpen(false)}>Cancelar</button>
                <button type="submit" className="primaryAction" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar lançamento'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}