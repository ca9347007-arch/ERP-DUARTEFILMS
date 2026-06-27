import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, Clock, Eye, EyeOff, Pencil, Plus, Search, Sparkles, Tag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, money } from '../api/client';
import { Appointment, Service } from '../types';

type ServiceForm = {
  name: string;
  description: string;
  priceReais: string;
  durationMinutes: string;
  isPublic: boolean;
  isActive: boolean;
};

const emptyForm: ServiceForm = {
  name: '',
  description: '',
  priceReais: '',
  durationMinutes: '60',
  isPublic: true,
  isActive: true
};

const appointmentStatusLabels: Record<string, string> = {
  PENDING: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_SERVICE: 'Em atendimento',
  FINISHED: 'Conclu�do',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu'
};

function parseMoneyToCents(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const number = Number(normalized || 0);
  return Math.round(number * 100);
}

function priceToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function quoteCode(appointment: Appointment) {
  const quote = appointment.quotes?.[0];
  return quote?.code || (quote?.sequence ? String(quote.sequence).padStart(6, '0') : 'sem orçamento');
}

export function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [operationalServices, setOperationalServices] = useState<Appointment[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [servicesRes, operationalRes] = await Promise.all([
        api.get('/services'),
        api.get('/services/operational')
      ]);
      setServices(servicesRes.data.services);
      setOperationalServices(operationalRes.data.operationalServices);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services;

    return services.filter((service) =>
      [service.name, service.description ?? '', String(service.durationMinutes), money(service.basePriceCents)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [services, search]);

  const scheduledServices = operationalServices.filter((appointment) => !['FINISHED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status));
  const doneServices = operationalServices.filter((appointment) => appointment.status === 'FINISHED');
  const lostServices = operationalServices.filter((appointment) => ['CANCELLED', 'NO_SHOW'].includes(appointment.status));
  const activeServices = services.filter((service) => service.isActive !== false).length;
  const publicServices = services.filter((service) => service.isPublic !== false).length;
  const averageTicket = services.length ? Math.round(services.reduce((total, service) => total + service.basePriceCents, 0) / services.length) : 0;
  const realizedTicket = doneServices.length ? Math.round(doneServices.reduce((total, appointment) => total + appointment.service.basePriceCents, 0) / doneServices.length) : 0;

  function openCreateDrawer() {
    setSelectedService(null);
    setForm(emptyForm);
    setError(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(service: Service) {
    setSelectedService(service);
    setForm({
      name: service.name,
      description: service.description ?? '',
      priceReais: priceToInput(service.basePriceCents),
      durationMinutes: String(service.durationMinutes),
      isPublic: service.isPublic !== false,
      isActive: service.isActive !== false
    });
    setError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (saving) return;
    setDrawerOpen(false);
    setSelectedService(null);
    setForm(emptyForm);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        basePriceCents: parseMoneyToCents(form.priceReais),
        durationMinutes: Number(form.durationMinutes || 60),
        isPublic: form.isPublic,
        isActive: form.isActive
      };

      if (selectedService) await api.patch(`/services/${selectedService.id}`, payload);
      else await api.post('/services', payload);

      await load();
      closeDrawer();
    } catch {
      setError('Não foi poss�vel salvar o serviço. Verifique nome, pre�o e dura��o.');
    } finally {
      setSaving(false);
    }
  }

  function goToQuoteFromAppointment(appointment: Appointment) {
    const quote = appointment.quotes?.[0];
    if (quote) navigate(`/orcamentos?quoteId=${quote.id}`);
    else navigate(`/orcamentos?clientId=${appointment.client.id}&serviceId=${appointment.service.id}&appointmentId=${appointment.id}`);
  }

  function renderOperationalItem(appointment: Appointment) {
    const quote = appointment.quotes?.[0];
    return (
      <div className="doneServiceItem operationalServiceItem" key={appointment.id}>
        <div>
          <strong>{appointment.service.name}</strong>
          <span>{appointment.client.name}{appointment.vehicle ? ` • ${appointment.vehicle.model}` : ''}</span>
          <small>{new Date(appointment.startsAt).toLocaleString('pt-BR')} • {appointmentStatusLabels[appointment.status] ?? appointment.status}</small>
        </div>
        <div className="operationalQuoteActions">
          <span className={appointment.status === 'FINISHED' ? 'statusBadge success' : ['CANCELLED', 'NO_SHOW'].includes(appointment.status) ? 'statusBadge muted' : 'statusBadge'}>{appointmentStatusLabels[appointment.status] ?? appointment.status}</span>
          <small>Orçamento #{quoteCode(appointment)}</small>
          <button type="button" className="ghostButton" onClick={() => goToQuoteFromAppointment(appointment)}>{quote ? 'Visualizar orçamento' : 'Gerar orçamento'}</button>
        </div>
      </div>
    );
  }

  return (
    <section className="premiumModule servicesModule">
      <div className="pageHeader premiumPageHeader">
        <div>
          <span className="eyebrow">Cat�logo premium</span>
          <h1>Serviços</h1>
          <p>Cat�logo comercial, agenda operacional, orçamentos vinculados e histórico de serviços.</p>
        </div>
        <button type="button" className="premiumAction" onClick={openCreateDrawer}><Plus size={18} /> Novo serviço</button>
      </div>

      <div className="clientStatsGrid">
        <div className="miniMetricCard"><span>Serviços cadastrados</span><strong>{services.length}</strong><small>Cat�logo completo</small></div>
        <div className="miniMetricCard"><span>Ativos</span><strong>{activeServices}</strong><small>Disponíveis para operação</small></div>
        <div className="miniMetricCard"><span>Públicos</span><strong>{publicServices}</strong><small>Aparecem no agendamento</small></div>
        <div className="miniMetricCard"><span>Ticket médio base</span><strong>{money(averageTicket)}</strong><small>M�dia do cat�logo</small></div>
      </div>

      <div className="serviceDonePanel operationalPanel">
        <div>
          <span className="eyebrow">Operação de serviços</span>
          <h2>Agendados, conclu�dos e perdidos</h2>
          <p>Todo agendamento aparece aqui com horário, cliente, status e orçamento vinculado.</p>
        </div>
        <div className="doneMetrics"><strong>{doneServices.length}</strong><span>conclu�do(s)</span><small>Ticket médio realizado: {money(realizedTicket)}</small></div>
        <div className="operationMiniMetrics"><span>{scheduledServices.length} agendado(s)</span><span>{lostServices.length} cancelado/não compareceu</span></div>
        <div className="doneServiceList operationalList">
          {operationalServices.slice(0, 8).map(renderOperationalItem)}
          {operationalServices.length === 0 ? <p>Nenhum atendimento registrado ainda. Quando um cliente agendar, o serviço aparecer� aqui.</p> : null}
        </div>
      </div>

      <div className="moduleToolbar">
        <label className="searchField" aria-label="Pesquisar serviços"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome, descrição, dura��o ou valor" /></label>
        <span className="toolbarHint">{filteredServices.length} resultado(s)</span>
      </div>

      <div className="serviceGrid">
        {loading ? (
          <div className="premiumEmptyState"><Sparkles size={42} /><strong>Carregando serviços...</strong><p>Buscando o cat�logo comercial da DuarteFilms.</p></div>
        ) : filteredServices.length === 0 ? (
          <div className="premiumEmptyState"><Sparkles size={46} /><strong>Nenhum serviço cadastrado ainda.</strong><p>Clique em <b>Novo serviço</b> para criar o cat�logo usado em agenda e orçamentos.</p><button type="button" onClick={openCreateDrawer}><Plus size={18} /> Novo serviço</button></div>
        ) : filteredServices.map((service) => (
          <article className="serviceCard" key={service.id}>
            <div className="serviceCardTop">
              <div className="serviceIcon"><Tag size={20} /></div>
              <div><strong>{service.name}</strong><span>{service.description || 'Sem descrição cadastrada'}</span></div>
              <button type="button" className="iconButton" onClick={() => openEditDrawer(service)} aria-label={`Editar ${service.name}`}><Pencil size={16} /></button>
            </div>
            <div className="servicePriceBlock"><span>Valor base</span><strong>{money(service.basePriceCents)}</strong></div>
            <div className="serviceMetaRow"><span><Clock size={15} /> {service.durationMinutes} min</span><span>{service.isPublic === false ? <EyeOff size={15} /> : <Eye size={15} />} {service.isPublic === false ? 'Interno' : 'Público'}</span></div>
            <div className="serviceStatusRow">
              <span className={service.isActive === false ? 'statusBadge muted' : 'statusBadge success'}>{service.isActive === false ? 'Inativo' : 'Ativo'}</span>
              <button type="button" className="quoteShortcutButton" onClick={() => navigate(`/orcamentos?serviceId=${service.id}`)}><ClipboardList size={16} /> Criar orçamento</button>
            </div>
          </article>
        ))}
      </div>

      {drawerOpen ? (
        <div className="drawerBackdrop" role="presentation" onMouseDown={closeDrawer}>
          <aside className="sideDrawer serviceDrawer" role="dialog" aria-modal="true" aria-label={selectedService ? 'Editar serviço' : 'Novo serviço'} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader"><div><span className="eyebrow">{selectedService ? 'Editar serviço' : 'Novo serviço'}</span><h2>{selectedService ? selectedService.name : 'Cadastrar serviço'}</h2><p>Formul�rio lateral para manter o cat�logo limpo, moderno e operacional.</p></div><button type="button" className="iconButton" onClick={closeDrawer} aria-label="Fechar gaveta"><X size={18} /></button></div>
            {error ? <div className="errorBanner">{error}</div> : null}
            <form className="drawerForm" onSubmit={submit}>
              <label>Nome do serviço<input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex: Película automotiva completa" /></label>
              <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva o serviço, material usado, garantia e observações comerciais." /></label>
              <div className="drawerTwoColumns"><label>Valor base em R$<input required value={form.priceReais} onChange={(event) => setForm({ ...form, priceReais: event.target.value })} placeholder="350,00" /></label><label>Dura��o em minutos<input type="number" min={15} max={480} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} /></label></div>
              <label className="checkboxLine"><input type="checkbox" checked={form.isPublic} onChange={(event) => setForm({ ...form, isPublic: event.target.checked })} /> Aparecer no agendamento público</label>
              <label className="checkboxLine"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Serviço ativo para operação</label>
              <div className="drawerActions"><button type="button" className="ghostButton" onClick={closeDrawer} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando...' : selectedService ? 'Salvar altera��es' : 'Cadastrar serviço'}</button></div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
