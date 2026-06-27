import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Edit3, Eye, MessageCircle, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api, money } from '../api/client';
import { Client, CompanySettings, Product, Quote, Service } from '../types';

type DiscountMode = 'VALUE' | 'PERCENT';

type QuoteFormItem = {
  localId: string;
  serviceId: string;
  productId: string;
  description: string;
  quantity: string;
  unitPriceReais: string;
};

type QuoteForm = {
  clientId: string;
  vehicleId: string;
  appointmentId: string;
  title: string;
  issuedAt: string;
  validUntil: string;
  notes: string;
  discountMode: DiscountMode;
  discountValue: string;
  items: QuoteFormItem[];
};

const emptyItem = (): QuoteFormItem => ({
  localId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()),
  serviceId: '',
  productId: '',
  description: '',
  quantity: '1',
  unitPriceReais: ''
});

const emptyForm = (): QuoteForm => ({
  clientId: '',
  vehicleId: '',
  appointmentId: '',
  title: '',
  issuedAt: new Date().toISOString().slice(0, 10),
  validUntil: '',
  notes: '',
  discountMode: 'VALUE',
  discountValue: '0,00',
  items: [emptyItem()]
});

const defaultSettings: CompanySettings = {
  fantasyName: 'DuarteFilms',
  legalName: 'DuarteFilms Estética Automotiva',
  document: '',
  phone: '',
  whatsapp: '',
  email: 'contato@duartefilms.local',
  address: '',
  city: '',
  state: '',
  defaultQuoteValidityDays: 7,
  quoteWarrantyText: 'Garantia conforme linha de película e serviço contratado.',
  quotePaymentText: 'Pagamento via PIX manual, dinheiro, cartão ou transferência.',
  businessHours: 'Segunda a sábado, das 08h �s 18h.'
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

function numberToPercentInput(value: number) {
  return value.toFixed(2).replace('.', ',');
}

function parsePercent(value: string) {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  return Math.max(0, Math.min(100, Number(normalized || 0)));
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function quoteCode(quote: Quote) {
  return quote.code || String(quote.sequence ?? 0).padStart(6, '0') || quote.id.slice(0, 6).toUpperCase();
}

function issuedLabel(quote: Quote) {
  return new Date(quote.issuedAt || quote.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
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

function companyLocation(settings: CompanySettings) {
  return [settings.address, settings.city, settings.state].filter(Boolean).join(' • ');
}

function QuoteDocument({ quote, settings }: { quote: Quote; settings: CompanySettings }) {
  return (
    <div className="quoteDocument" id="printableQuoteDocument">
      <header className="quoteDocHeader">
        <div className="quoteDocBrand">
          <div className="brandMark">DF</div>
          <div>
            <strong>{settings.fantasyName || 'DuarteFilms'}</strong>
            <span>Estética & Proteção</span>
          </div>
        </div>
        <div className="quoteDocMeta">
          <h2>ORÇAMENTO</h2>
          <span>{statusLabels[quote.status] ?? quote.status}</span>
          <div className="quoteDocMetaGrid">
            <small>Número <b>#{quoteCode(quote)}</b></small>
            <small>Emissão <b>{issuedLabel(quote)}</b></small>
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
          <p><b>Empresa:</b> {settings.legalName || settings.fantasyName}</p>
          {settings.document ? <p><b>CNPJ/CPF:</b> {settings.document}</p> : null}
          {settings.phone || settings.whatsapp ? <p><b>Contato:</b> {settings.phone || settings.whatsapp}</p> : null}
          {settings.email ? <p><b>E-mail:</b> {settings.email}</p> : null}
          {companyLocation(settings) ? <p><b>Endere�o:</b> {companyLocation(settings)}</p> : null}
        </div>
      </section>

      <table className="quoteItemsTable">
        <thead>
          <tr><th>Item / descrição</th><th>Qtd</th><th>Valor unit.</th><th>Total</th></tr>
        </thead>
        <tbody>
          {quote.items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.service?.name || item.product?.name || item.description}</strong>
                <span>{item.description}</span>
              </td>
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
          <p>{settings.quotePaymentText || defaultSettings.quotePaymentText} {settings.quoteWarrantyText || defaultSettings.quoteWarrantyText}</p>
          {settings.businessHours ? <small>Horário de atendimento: {settings.businessHours}</small> : null}
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
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [form, setForm] = useState<QuoteForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [quotesRes, clientsRes, servicesRes, productsRes, settingsRes] = await Promise.all([
      api.get('/quotes'),
      api.get('/clients'),
      api.get('/services'),
      api.get('/products'),
      api.get('/settings/company').catch(() => ({ data: { settings: defaultSettings } }))
    ]);
    setQuotes(quotesRes.data.quotes);
    setClients(clientsRes.data.clients);
    setServices(servicesRes.data.services);
    setProducts(productsRes.data.products);
    setSettings({ ...defaultSettings, ...settingsRes.data.settings });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const quoteId = searchParams.get('quoteId');
    if (!quoteId || quotes.length === 0) return;
    const quote = quotes.find((item) => item.id === quoteId);
    if (quote) {
      setPreviewQuote(quote);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, quotes, setSearchParams]);

  useEffect(() => {
    const clientId = searchParams.get('clientId') ?? '';
    const serviceId = searchParams.get('serviceId') ?? '';
    const appointmentId = searchParams.get('appointmentId') ?? '';
    if (!clientId && !serviceId && !appointmentId) return;

    const service = services.find((item) => item.id === serviceId);
    const next = emptyForm();
    next.clientId = clientId;
    next.appointmentId = appointmentId;
    next.title = service ? `Orçamento - ${service.name}` : 'Orçamento DuarteFilms';
    next.items = [{
      ...emptyItem(),
      serviceId,
      description: service?.description || service?.name || '',
      unitPriceReais: service ? priceToInput(service.basePriceCents) : ''
    }];
    setForm(next);
    setEditingQuote(null);
    setDrawerOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, services, setSearchParams]);

  const selectedClient = clients.find((client) => client.id === form.clientId);

  const subtotalCents = useMemo(() => form.items.reduce((sum, item) => sum + (Number(item.quantity || 1) * parseMoneyToCents(item.unitPriceReais)), 0), [form.items]);
  const discountCents = useMemo(() => {
    const value = form.discountMode === 'PERCENT'
      ? Math.round(subtotalCents * (parsePercent(form.discountValue) / 100))
      : parseMoneyToCents(form.discountValue);
    return Math.min(subtotalCents, Math.max(0, value));
  }, [form.discountMode, form.discountValue, subtotalCents]);
  const totalCents = Math.max(0, subtotalCents - discountCents);

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
    setForm(emptyForm());
    setEditingQuote(null);
    setError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (saving) return;
    setDrawerOpen(false);
    setEditingQuote(null);
    setForm(emptyForm());
    setError(null);
  }

  function updateItem(localId: string, patch: Partial<QuoteFormItem>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => item.localId === localId ? { ...item, ...patch } : item)
    }));
  }

  function handleItemServiceChange(localId: string, serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    updateItem(localId, {
      serviceId,
      productId: '',
      description: service?.description || service?.name || '',
      unitPriceReais: service ? priceToInput(service.basePriceCents) : ''
    });
  }

  function handleItemProductChange(localId: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    updateItem(localId, {
      productId,
      serviceId: '',
      description: product ? `${product.name}${product.brand ? ` • ${product.brand}` : ''}${product.unit ? ` (${product.unit})` : ''}` : '',
      unitPriceReais: product ? priceToInput(product.costCents) : ''
    });
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  }

  function removeItem(localId: string) {
    setForm((current) => ({ ...current, items: current.items.length > 1 ? current.items.filter((item) => item.localId !== localId) : current.items }));
  }

  function openEditQuote(quote: Quote) {
    const discountPercent = quote.subtotalCents ? (quote.discountCents / quote.subtotalCents) * 100 : 0;
    setEditingQuote(quote);
    setForm({
      clientId: quote.client.id,
      vehicleId: quote.vehicle?.id ?? '',
      appointmentId: quote.appointment?.id ?? '',
      title: quote.title,
      issuedAt: toDateInput(quote.issuedAt || quote.createdAt),
      validUntil: toDateInput(quote.validUntil),
      notes: quote.notes ?? '',
      discountMode: 'VALUE',
      discountValue: priceToInput(quote.discountCents),
      items: quote.items.map((item) => ({
        localId: item.id,
        serviceId: item.serviceId ?? '',
        productId: item.productId ?? '',
        description: item.description,
        quantity: String(item.quantity),
        unitPriceReais: priceToInput(item.unitPriceCents)
      })) || [emptyItem()]
    });
    if (quote.discountCents && discountPercent > 0) {
      setForm((current) => ({ ...current, discountMode: 'VALUE', discountValue: priceToInput(quote.discountCents) }));
    }
    setError(null);
    setDrawerOpen(true);
  }

  function duplicateQuote(quote: Quote) {
    openEditQuote(quote);
    setEditingQuote(null);
    setForm((current) => ({ ...current, title: `${quote.title} - c�pia`, issuedAt: new Date().toISOString().slice(0, 10) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        clientId: form.clientId,
        vehicleId: form.vehicleId || undefined,
        appointmentId: form.appointmentId || undefined,
        title: form.title.trim(),
        discountCents,
        issuedAt: form.issuedAt ? new Date(`${form.issuedAt}T12:00:00`).toISOString() : undefined,
        validUntil: form.validUntil ? new Date(`${form.validUntil}T23:59:59`).toISOString() : undefined,
        notes: form.notes.trim(),
        items: form.items.map((item) => ({
          serviceId: item.serviceId || undefined,
          productId: item.productId || undefined,
          description: item.description.trim(),
          quantity: Number(item.quantity || 1),
          unitPriceCents: parseMoneyToCents(item.unitPriceReais)
        }))
      };

      if (editingQuote) {
        await api.patch(`/quotes/${editingQuote.id}`, payload);
      } else {
        await api.post('/quotes', payload);
      }
      await load();
      closeDrawer();
    } catch {
      setError('Não foi poss�vel salvar o orçamento. Verifique cliente, itens, descrição e valores.');
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

  async function printQuote(quote: Quote) {
    const sourceNode = (
      document.getElementById("printableQuoteDocument") ||
      document.querySelector(".quoteDocument")
    ) as HTMLElement | null;

    if (!sourceNode) {
      alert("Documento do orcamento nao encontrado para gerar PDF.");
      return;
    }

    const fileCode = typeof quoteCode === "function"
      ? quoteCode(quote)
      : String(quote?.code || "000000").replace(/[^0-9]/g, "").padStart(6, "0");

    const fileName = `DuarteFilms OS ${fileCode}.pdf`;

    const stage = document.createElement("div");
    stage.className = "pdfCaptureStage";
    stage.setAttribute("aria-hidden", "true");

    const cloned = sourceNode.cloneNode(true) as HTMLElement;
    cloned.classList.add("pdfQuoteDocument");

    stage.appendChild(cloned);
    document.body.appendChild(stage);

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const canvas = await html2canvas(cloned, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: cloned.scrollWidth,
        windowHeight: cloned.scrollHeight
      });

      const pdf = new jsPDF("p", "mm", "a4");

      const pageW = 210;
      const pageH = 297;
      const margin = 6;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      const imgW = canvas.width;
      const imgH = canvas.height;

      const heightIfFitWidth = imgH * (usableW / imgW);

      if (heightIfFitWidth <= usableH) {
        const ratio = Math.min(usableW / imgW, usableH / imgH);
        const finalW = imgW * ratio;
        const finalH = imgH * ratio;
        const x = (pageW - finalW) / 2;
        const y = (pageH - finalH) / 2;

        pdf.addImage(
          canvas.toDataURL("image/png", 1.0),
          "PNG",
          x,
          y,
          finalW,
          finalH,
          undefined,
          "FAST"
        );
      } else {
        const ratio = usableW / imgW;
        const pagePxH = Math.floor(usableH / ratio);
        let yPx = 0;
        let pageIndex = 0;

        while (yPx < imgH) {
          const sliceH = Math.min(pagePxH, imgH - yPx);

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = imgW;
          pageCanvas.height = sliceH;

          const ctx = pageCanvas.getContext("2d");

          if (!ctx) {
            throw new Error("Falha ao criar contexto do canvas para PDF.");
          }

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, yPx, imgW, sliceH, 0, 0, imgW, sliceH);

          if (pageIndex > 0) pdf.addPage();

          const finalH = sliceH * ratio;

          pdf.addImage(
            pageCanvas.toDataURL("image/png", 1.0),
            "PNG",
            margin,
            margin,
            usableW,
            finalH,
            undefined,
            "FAST"
          );

          yPx += sliceH;
          pageIndex++;
        }
      }

      pdf.save(fileName);
    } finally {
      stage.remove();
    }
  }

  function renderQuoteCard(quote: Quote) {
    const followUp = isFollowUpNeeded(quote);
    const message = `Ol�, ${quote.client.name}! Passando para saber se ficou alguma d�vida sobre o orçamento ${quoteCode(quote)} da DuarteFilms. Podemos avaliar uma condi��o ou ajuste para fechar o serviço?`;

    return (
      <article className={`quotePipelineCard status-${quote.status.toLowerCase()}`} key={quote.id}>
        {followUp ? <span className="followUpRibbon"><AlertTriangle size={14} /> Contatar cliente</span> : null}
        <div className="quotePipelineTop">
          <span>#{quoteCode(quote)}</span>
          <strong>{money(quote.totalCents)}</strong>
        </div>
        <h3>{quote.title}</h3>
        <p>{quote.client.name}{quote.vehicle ? ` • ${quote.vehicle.model}` : ''}</p>
        {quote.appointment ? <small>Agenda: {new Date(quote.appointment.startsAt).toLocaleString('pt-BR')}</small> : null}
        <small>Emitido em {issuedLabel(quote)} • {statusLabels[quote.status] ?? quote.status}</small>
        <div className="quotePipelineActions">
          <button type="button" className="ghostButton" onClick={() => setPreviewQuote(quote)}><Eye size={15} /> Visualizar</button>
          <button type="button" className="ghostButton" onClick={() => openEditQuote(quote)}><Edit3 size={15} /> Editar</button>
          <button type="button" className="ghostButton" onClick={() => duplicateQuote(quote)}><Copy size={15} /> Duplicar</button>
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
        <div className="drawerBackdrop quoteFullScreenBackdrop" role="presentation" onMouseDown={closeDrawer}>
          <aside className="sideDrawer quoteDrawer quoteFullScreenDrawer" role="dialog" aria-modal="true" aria-label="Orçamento" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader">
              <div>
                <span className="eyebrow">{editingQuote ? 'Editar orçamento' : 'Novo orçamento'}</span>
                <h2>{editingQuote ? `Editar #${quoteCode(editingQuote)}` : 'Criar orçamento'}</h2>
                <p>Monte o orçamento em tela cheia com serviço padr�o, item manual ou material do estoque.</p>
              </div>
              <button type="button" className="iconButton" onClick={closeDrawer} aria-label="Fechar gaveta"><X size={18} /></button>
            </div>
            {error ? <div className="errorBanner">{error}</div> : null}
            <form className="drawerForm quoteBuilderForm" onSubmit={submit}>
              <div className="quoteBuilderGrid">
                <label>Cliente<select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, vehicleId: '' })}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
                <label>Veículo<select value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}><option value="">Sem veículo vinculado</option>{selectedClient?.vehicles?.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand ? `${vehicle.brand} ` : ''}{vehicle.model}{vehicle.plate ? ` • ${vehicle.plate}` : ''}</option>)}</select></label>
                <label>T�tulo<input required minLength={2} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: Orçamento película automotiva" /></label>
                <label>Emissão<input type="date" value={form.issuedAt} onChange={(event) => setForm({ ...form, issuedAt: event.target.value })} /></label>
                <label>V�lido at�<input type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} /></label>
              </div>

              <div className="quoteItemsEditor">
                <div className="quoteItemsEditorHeader"><strong>Itens do orçamento</strong><button type="button" className="ghostButton" onClick={addItem}><Plus size={16} /> Adicionar item</button></div>
                {form.items.map((item, index) => (
                  <div className="quoteItemEditor" key={item.localId}>
                    <div className="quoteItemEditorTop"><span>Item {index + 1}</span><button type="button" className="iconButton" onClick={() => removeItem(item.localId)}><Trash2 size={15} /></button></div>
                    <div className="quoteBuilderGrid itemGrid">
                      <label>Serviço cadastrado<select value={item.serviceId} onChange={(event) => handleItemServiceChange(item.localId, event.target.value)}><option value="">Personalizado/manual</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} • {money(service.basePriceCents)}</option>)}</select></label>
                      <label>Material do estoque<select value={item.productId} onChange={(event) => handleItemProductChange(item.localId, event.target.value)}><option value="">Sem item do estoque</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brand ? ` • ${product.brand}` : ''} • estoque {String(product.stockQuantity)} {product.unit}</option>)}</select></label>
                      <label className="wideField">Descrição<textarea required value={item.description} onChange={(event) => updateItem(item.localId, { description: event.target.value })} placeholder="Descreva serviço, linha, película, garantia ou condi��o comercial." /></label>
                      <label>Quantidade<input type="number" min={1} value={item.quantity} onChange={(event) => updateItem(item.localId, { quantity: event.target.value })} /></label>
                      <label>Valor unit�rio R$<input required value={item.unitPriceReais} onChange={(event) => updateItem(item.localId, { unitPriceReais: event.target.value })} placeholder="350,00" /></label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="quoteBuilderSummary">
                <label>Tipo de desconto<select value={form.discountMode} onChange={(event) => setForm({ ...form, discountMode: event.target.value as DiscountMode, discountValue: event.target.value === 'PERCENT' ? '0,00' : '0,00' })}><option value="VALUE">Desconto em R$</option><option value="PERCENT">Desconto em %</option></select></label>
                <label>{form.discountMode === 'PERCENT' ? 'Desconto %' : 'Desconto R$'}<input value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} placeholder={form.discountMode === 'PERCENT' ? '10,00' : '100,00'} /></label>
                <div className="quoteLiveTotals"><span>Subtotal: <b>{money(subtotalCents)}</b></span><span>Desconto: <b>{form.discountMode === 'PERCENT' ? `${numberToPercentInput(parsePercent(form.discountValue))}% / ` : ''}{money(discountCents)}</b></span><strong>Total: {money(totalCents)}</strong></div>
              </div>

              <label>Observa��es internas<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Motivo do desconto, negocia��o, observações comerciais." /></label>
              <div className="drawerActions"><button type="button" className="ghostButton" onClick={closeDrawer} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando...' : editingQuote ? 'Salvar altera��es' : 'Gerar orçamento'}</button></div>
            </form>
          </aside>
        </div>
      ) : null}

      {previewQuote ? (
        <div className="drawerBackdrop quotePrintBackdrop" role="presentation" onMouseDown={() => setPreviewQuote(null)}>
          <aside className="sideDrawer quotePreviewDrawer" role="dialog" aria-modal="true" aria-label="Visualizar orçamento" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader noPrint">
              <div><span className="eyebrow">Pré-visualização</span><h2>#{quoteCode(previewQuote)}</h2><p>Modelo premium baseado no documento comercial da DuarteFilms.</p></div>
              <div className="previewActions"><button type="button" className="ghostButton" onClick={() => printQuote(previewQuote)}><Printer size={16} /> PDF</button><button type="button" className="iconButton" onClick={() => setPreviewQuote(null)}><X size={18} /></button></div>
            </div>
            <QuoteDocument quote={previewQuote} settings={settings} />
          </aside>
        </div>
      ) : null}
    </section>
  );
}
