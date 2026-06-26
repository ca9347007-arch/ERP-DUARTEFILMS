import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Download, Eye, FileText, MessageCircle, Plus, RefreshCcw, Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api, money } from '../api/client';
import { Client, Quote, QuoteItem, Service } from '../types';

type QuoteForm = {
  clientId: string;
  vehicleId: string;
  serviceId: string;
  title: string;
  description: string;
  quantity: string;
  unitPriceReais: string;
  discountReais: string;
  validUntil: string;
  notes: string;
  appointmentId: string;
};

const emptyForm: QuoteForm = {
  clientId: '',
  vehicleId: '',
  serviceId: '',
  title: '',
  description: '',
  quantity: '1',
  unitPriceReais: '',
  discountReais: '0,00',
  validUntil: '',
  notes: '',
  appointmentId: ''
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Aguardando aprovação',
  APPROVED: 'Aprovado / OS',
  REJECTED: 'Não fechado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado'
};

function parseMoneyToCents(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const number = Number(normalized || 0);
  return Math.round(number * 100);
}

function priceToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function quoteCode(quote: Quote) {
  return quote.code || `OS-${new Date(quote.createdAt).getFullYear()}-${quote.id.slice(0, 6).toUpperCase()}`;
}

function createdLabel(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isFollowUpNeeded(quote: Quote) {
  if (!['DRAFT', 'SENT'].includes(quote.status)) return false;
  const ageMs = Date.now() - new Date(quote.createdAt).getTime();
  return ageMs >= 3 * 24 * 60 * 60 * 1000;
}

function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function QuoteDocument({ quote }: { quote: Quote }) {
  return (
    <div className="quoteDocument">
      <header className="quoteDocHeader">
        <div className="quoteDocBrand">
          <div className="brandMark">DF</div>
          <div><strong>DuarteFilms</strong><span>Estética & Proteção</span></div>
        </div>
        <div className="quoteDocMeta">
          <h2>ORÇAMENTO</h2>
          <span>{statusLabels[quote.status] ?? quote.status}</span>
          <div className="quoteDocMetaGrid">
            <small>Número <b>#{quoteCode(quote)}</b></small>
            <small>Emissão <b>{createdLabel(quote.createdAt)}</b></small>
            <small>Cliente <b>{quote.client.name}</b></small>
            <small>Total <b>{money(quote.totalCents)}</b></small>
          </div>
        </div>
      </header>

      <section className="quoteDocInfoGrid">
        <div>
          <h3>Preparado para</h3>
          <p><b>Cliente:</b> {quote.client.name}</p>
          <p><b>Contato:</b> {quote.client.phone}</p>
          <p><b>Veículo:</b> {quote.vehicle ? `${quote.vehicle.brand ? `${quote.vehicle.brand} ` : ''}${quote.vehicle.model}${quote.vehicle.plate ? ` • ${quote.vehicle.plate}` : ''}` : 'Não vinculado'}</p>
        </div>
        <div>
          <h3>Dados da empresa</h3>
          <p><b>Empresa:</b> DuarteFilms Estética Automotiva</p>
          <p><b>E-mail:</b> contato@duartefilms.local</p>
          <p><b>Atendente:</b> Admin Local</p>
        </div>
      </section>

      <table className="quoteItemsTable">
        <thead>
          <tr><th>Item / descrição</th><th>Qtd</th><th>Valor unit.</th><th>Total</th></tr>
        </thead>
        <tbody>
          {quote.items.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.service?.name || item.description}</strong><span>{item.description}</span></td>
              <td>{item.quantity}</td>
              <td>{money(item.unitPriceCents)}</td>
              <td>{money(item.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="quoteTotalsBox">
        <div><span>Subtotal</span><strong>{money(quote.subtotalCents)}</strong></div>
        <div><span>Desconto</span><strong>- {money(quote.discountCents)}</strong></div>
        <div className="grandTotal"><span>Valor total</span><strong>{money(quote.totalCents)}</strong></div>
      </section>

      <footer className="quoteDocFooter">
        <div>
          <h4>Termos & garantia</h4>
          <p>Orçamento válido pelo prazo informado. Pagamento via PIX manual, dinheiro, cartão ou transferência. Garantia conforme linha de película e serviço contratado.</p>
        </div>
        <div className="signatureLine">Assinatura do cliente</div>
      </footer>
    </div>
  );
}

export function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [quotesRes, clientsRes, servicesRes] = await Promise.all([
      api.get('/quotes'),
      api.get('/clients'),
      api.get('/services')
    ]);
    setQuotes(quotesRes.data.quotes);
    setClients(clientsRes.data.clients);
    setServices(servicesRes.data.services);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const clientId = searchParams.get('clientId') ?? '';
    const serviceId = searchParams.get('serviceId') ?? '';
    const appointmentId = searchParams.get('appointmentId') ?? '';
    if (!clientId && !serviceId && !appointmentId) return;

    const service = services.find((item) => item.id === serviceId);
    setForm({
      ...emptyForm,
      clientId,
      serviceId,
      appointmentId,
      title: service ? `Orçamento - ${service.name}` : 'Orçamento DuarteFilms',
      description: service?.description || service?.name || '',
      unitPriceReais: service ? priceToInput(service.basePriceCents) : ''
    });
    setDrawerOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, services, setSearchParams]);

  const selectedClient = clients.find((client) => client.id === form.clientId);
  const selectedService = services.find((service) => service.id === form.serviceId);

  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotes;
    return quotes.filter((quote) => [quoteCode(quote), quote.title, quote.status, quote.client.name, quote.vehicle?.model ?? '', money(quote.totalCents)]
      .join(' ')
      .toLowerCase()
      .includes(term));
  }, [quotes, search]);

  const stats = useMemo(() => ({
    total: quotes.length,
    open: quotes.filter((quote) => ['DRAFT', 'SENT'].includes(quote.status)).length,
    approved: quotes.filter((quote) => quote.status === 'APPROVED').length,
    followUps: quotes.filter(isFollowUpNeeded).length
  }), [quotes]);

  function openCreateDrawer() {
    setForm(emptyForm);
    setError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (saving) return;
    setDrawerOpen(false);
    setForm(emptyForm);
    setError(null);
  }

  function handleServiceChange(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    setForm({
      ...form,
      serviceId,
      title: service ? `Orçamento - ${service.name}` : form.title,
      description: service?.description || service?.name || form.description,
      unitPriceReais: service ? priceToInput(service.basePriceCents) : form.unitPriceReais
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.post('/quotes', {
        clientId: form.clientId,
        vehicleId: form.vehicleId || undefined,
        appointmentId: form.appointmentId || undefined,
        title: form.title.trim(),
        discountCents: parseMoneyToCents(form.discountReais),
        validUntil: form.validUntil ? new Date(`${form.validUntil}T23:59:59`).toISOString() : undefined,
        notes: form.notes.trim(),
        items: [{
          serviceId: form.serviceId || undefined,
          description: form.description.trim() || selectedService?.name || form.title.trim(),
          quantity: Number(form.quantity || 1),
          unitPriceCents: parseMoneyToCents(form.unitPriceReais)
        }]
      });
      await load();
      closeDrawer();
    } catch {
      setError('Não foi possível criar o orçamento. Verifique cliente, serviço, descrição e valores.');
    } finally {
      setSaving(false);
    }
  }

  async function approveQuote(quote: Quote) {
    await api.post(`/quotes/${quote.id}/approve`);
    await load();
  }

  async function changeQuoteStatus(quote: Quote, status: string) {
    await api.patch(`/quotes/${quote.id}/status`, { status });
    await load();
  }

  function renderQuoteCard(quote: Quote) {
    const followUp = isFollowUpNeeded(quote);
    const message = `Olá, ${quote.client.name}! Passando para saber se ficou alguma dúvida sobre o orçamento ${quoteCode(quote)} da DuarteFilms. Podemos avaliar uma condição ou ajuste para fechar o serviço?`;

    return (
      <article className={`quotePipelineCard status-${quote.status.toLowerCase()}`} key={quote.id}>
        {followUp ? <span className="followUpRibbon"><AlertTriangle size={14} /> Contatar cliente</span> : null}
        <div className="quotePipelineTop">
          <span>{quoteCode(quote)}</span>
          <strong>{money(quote.totalCents)}</strong>
        </div>
        <h3>{quote.title}</h3>
        <p>{quote.client.name}{quote.vehicle ? ` • ${quote.vehicle.model}` : ''}</p>
        <small>Emitido em {createdLabel(quote.createdAt)} · {statusLabels[quote.status] ?? quote.status}</small>
        <div className="quotePipelineActions">
          <button type="button" className="ghostButton" onClick={() => setPreviewQuote(quote)}><Eye size={15} /> Visualizar</button>
          {['DRAFT', 'SENT'].includes(quote.status) ? <button type="button" onClick={() => approveQuote(quote)}><CheckCircle2 size={15} /> Aprovar</button> : null}
          {['DRAFT', 'SENT'].includes(quote.status) ? <a className="ghostButton" href={whatsappLink(quote.client.phone, message)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a> : null}
        </div>
        {['DRAFT', 'SENT'].includes(quote.status) ? (
          <div className="quoteStatusActions">
            <button type="button" className="ghostButton" onClick={() => changeQuoteStatus(quote, 'REJECTED')}>Marcar não fechado</button>
            <button type="button" className="ghostButton" onClick={() => changeQuoteStatus(quote, 'CANCELLED')}>Cancelar</button>
          </div>
        ) : null}
      </article>
    );
  }

  const openQuotes = filteredQuotes.filter((quote) => ['DRAFT', 'SENT'].includes(quote.status) && !isFollowUpNeeded(quote));
  const followUpQuotes = filteredQuotes.filter(isFollowUpNeeded);
  const approvedQuotes = filteredQuotes.filter((quote) => quote.status === 'APPROVED');
  const lostQuotes = filteredQuotes.filter((quote) => ['REJECTED', 'EXPIRED', 'CANCELLED'].includes(quote.status));

  return (
    <section className="quotesPremiumModule">
      <div className="pageHeader premiumPageHeader">
        <div>
          <span className="eyebrow">Central comercial</span>
          <h1>Orçamentos e OS</h1>
          <p>Funil de orçamento, follow-up automático de 3 dias e pré-visualização premium para PDF.</p>
        </div>
        <button type="button" className="premiumAction" onClick={openCreateDrawer}><Plus size={18} /> Novo orçamento</button>
      </div>

      <div className="clientStatsGrid">
        <div className="miniMetricCard"><span>Orçamentos</span><strong>{stats.total}</strong><small>Histórico completo</small></div>
        <div className="miniMetricCard"><span>Em aberto</span><strong>{stats.open}</strong><small>Aguardando decisão</small></div>
        <div className="miniMetricCard"><span>Aprovados</span><strong>{stats.approved}</strong><small>Viraram OS</small></div>
        <div className="miniMetricCard"><span>Follow-up</span><strong>{stats.followUps}</strong><small>Mais de 3 dias sem fechar</small></div>
      </div>

      <div className="moduleToolbar">
        <label className="searchField" aria-label="Pesquisar orçamentos">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por número, cliente, veículo, status ou valor" />
        </label>
        <span className="toolbarHint">{filteredQuotes.length} resultado(s)</span>
      </div>

      <div className="quotePipeline">
        <div className="quoteColumn"><h2>Em aberto</h2>{openQuotes.length ? openQuotes.map(renderQuoteCard) : <p className="emptyColumn">Nenhum orçamento em aberto.</p>}</div>
        <div className="quoteColumn attention"><h2>Follow-up 3 dias</h2>{followUpQuotes.length ? followUpQuotes.map(renderQuoteCard) : <p className="emptyColumn">Nenhum cliente pendente de retorno.</p>}</div>
        <div className="quoteColumn"><h2>Aprovados / OS</h2>{approvedQuotes.length ? approvedQuotes.map(renderQuoteCard) : <p className="emptyColumn">Nenhuma OS aprovada ainda.</p>}</div>
        <div className="quoteColumn"><h2>Não fechados</h2>{lostQuotes.length ? lostQuotes.map(renderQuoteCard) : <p className="emptyColumn">Nenhum orçamento perdido.</p>}</div>
      </div>

      {drawerOpen ? (
        <div className="drawerBackdrop" role="presentation" onMouseDown={closeDrawer}>
          <aside className="sideDrawer quoteDrawer" role="dialog" aria-modal="true" aria-label="Novo orçamento" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader">
              <div><span className="eyebrow">Novo orçamento</span><h2>Criar orçamento</h2><p>Use cliente, veículo e serviço para gerar um orçamento rastreável.</p></div>
              <button type="button" className="iconButton" onClick={closeDrawer} aria-label="Fechar gaveta"><X size={18} /></button>
            </div>
            {error ? <div className="errorBanner">{error}</div> : null}
            <form className="drawerForm" onSubmit={submit}>
              <label>Cliente<select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, vehicleId: '' })}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
              <label>Veículo<select value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}><option value="">Sem veículo vinculado</option>{selectedClient?.vehicles?.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand ? `${vehicle.brand} ` : ''}{vehicle.model}{vehicle.plate ? ` • ${vehicle.plate}` : ''}</option>)}</select></label>
              <label>Serviço<select value={form.serviceId} onChange={(event) => handleServiceChange(event.target.value)}><option value="">Personalizado</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {money(service.basePriceCents)}</option>)}</select></label>
              <label>Título<input required minLength={2} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: Orçamento película automotiva" /></label>
              <label>Descrição<textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Detalhe serviço, linha de película, garantia, condição e observações." /></label>
              <div className="drawerTwoColumns">
                <label>Quantidade<input type="number" min={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
                <label>Valor unitário R$<input required value={form.unitPriceReais} onChange={(event) => setForm({ ...form, unitPriceReais: event.target.value })} placeholder="350,00" /></label>
              </div>
              <div className="drawerTwoColumns">
                <label>Desconto R$<input value={form.discountReais} onChange={(event) => setForm({ ...form, discountReais: event.target.value })} /></label>
                <label>Válido até<input type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} /></label>
              </div>
              <label>Observações internas<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Motivo do desconto, negociação, observações comerciais." /></label>
              <div className="drawerActions"><button type="button" className="ghostButton" onClick={closeDrawer} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Gerar orçamento'}</button></div>
            </form>
          </aside>
        </div>
      ) : null}

      {previewQuote ? (
        <div className="drawerBackdrop" role="presentation" onMouseDown={() => setPreviewQuote(null)}>
          <aside className="sideDrawer quotePreviewDrawer" role="dialog" aria-modal="true" aria-label="Visualizar orçamento" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader">
              <div><span className="eyebrow">Pré-visualização</span><h2>{quoteCode(previewQuote)}</h2><p>Modelo premium baseado no documento comercial da DuarteFilms.</p></div>
              <div className="previewActions"><button type="button" className="ghostButton" onClick={() => window.print()}><Download size={16} /> PDF</button><button type="button" className="iconButton" onClick={() => setPreviewQuote(null)}><X size={18} /></button></div>
            </div>
            <QuoteDocument quote={previewQuote} />
          </aside>
        </div>
      ) : null}
    </section>
  );
}
