import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock, Eye, EyeOff, Pencil, Plus, Search, Sparkles, Tag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, money } from '../api/client';
import { Service } from '../types';

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

function parseMoneyToCents(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const number = Number(normalized || 0);
  return Math.round(number * 100);
}

function priceToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
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
      const res = await api.get('/services');
      setServices(res.data.services);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  const activeServices = services.filter((service) => service.isActive !== false).length;
  const publicServices = services.filter((service) => service.isPublic !== false).length;
  const averageTicket = services.length
    ? Math.round(services.reduce((total, service) => total + service.basePriceCents, 0) / services.length)
    : 0;

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

      if (selectedService) {
        await api.patch(`/services/${selectedService.id}`, payload);
      } else {
        await api.post('/services', payload);
      }

      await load();
      closeDrawer();
    } catch {
      setError('Não foi possível salvar o serviço. Verifique nome, preço e duração.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="premiumModule servicesModule">
      <div className="pageHeader premiumPageHeader">
        <div>
          <span className="eyebrow">Catálogo premium</span>
          <h1>Serviços</h1>
          <p>Catálogo comercial usado no agendamento público, orçamento e ordens de serviço.</p>
        </div>
        <button type="button" className="premiumAction" onClick={openCreateDrawer}>
          <Plus size={18} /> Novo serviço
        </button>
      </div>

      <div className="clientStatsGrid">
        <div className="miniMetricCard">
          <span>Serviços cadastrados</span>
          <strong>{services.length}</strong>
          <small>Catálogo completo</small>
        </div>
        <div className="miniMetricCard">
          <span>Ativos</span>
          <strong>{activeServices}</strong>
          <small>Disponíveis para operação</small>
        </div>
        <div className="miniMetricCard">
          <span>Públicos</span>
          <strong>{publicServices}</strong>
          <small>Aparecem no agendamento</small>
        </div>
        <div className="miniMetricCard">
          <span>Ticket médio base</span>
          <strong>{money(averageTicket)}</strong>
          <small>Média do catálogo</small>
        </div>
      </div>

      <div className="moduleToolbar">
        <label className="searchField" aria-label="Pesquisar serviços">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por nome, descrição, duração ou valor"
          />
        </label>
        <span className="toolbarHint">{filteredServices.length} resultado(s)</span>
      </div>

      <div className="serviceGrid">
        {loading ? (
          <div className="premiumEmptyState">
            <Sparkles size={42} />
            <strong>Carregando serviços...</strong>
            <p>Buscando o catálogo comercial da DuarteFilms.</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="premiumEmptyState">
            <Sparkles size={46} />
            <strong>Nenhum serviço cadastrado ainda.</strong>
            <p>Clique em <b>Novo serviço</b> para criar o catálogo usado em agenda e orçamentos.</p>
            <button type="button" onClick={openCreateDrawer}><Plus size={18} /> Novo serviço</button>
          </div>
        ) : (
          filteredServices.map((service) => (
            <article className="serviceCard" key={service.id}>
              <div className="serviceCardTop">
                <div className="serviceIcon"><Tag size={20} /></div>
                <div>
                  <strong>{service.name}</strong>
                  <span>{service.description || 'Sem descrição cadastrada'}</span>
                </div>
                <button type="button" className="iconButton" onClick={() => openEditDrawer(service)} aria-label={`Editar ${service.name}`}>
                  <Pencil size={16} />
                </button>
              </div>

              <div className="servicePriceBlock">
                <span>Valor base</span>
                <strong>{money(service.basePriceCents)}</strong>
              </div>

              <div className="serviceMetaRow">
                <span><Clock size={15} /> {service.durationMinutes} min</span>
                <span>{service.isPublic === false ? <EyeOff size={15} /> : <Eye size={15} />} {service.isPublic === false ? 'Interno' : 'Público'}</span>
              </div>

              <div className="serviceStatusRow">
                <span className={service.isActive === false ? 'statusBadge muted' : 'statusBadge success'}>
                  {service.isActive === false ? 'Inativo' : 'Ativo'}
                </span>
                <button
                  type="button"
                  className="quoteShortcutButton"
                  onClick={() => navigate(`/orcamentos?serviceId=${service.id}`)}
                >
                  <ClipboardList size={16} /> Criar orçamento
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {drawerOpen ? (
        <div className="drawerBackdrop" role="presentation" onMouseDown={closeDrawer}>
          <aside className="sideDrawer" role="dialog" aria-modal="true" aria-label={selectedService ? 'Editar serviço' : 'Novo serviço'} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader">
              <div>
                <span className="eyebrow">{selectedService ? 'Editar serviço' : 'Novo serviço'}</span>
                <h2>{selectedService ? selectedService.name : 'Cadastrar serviço'}</h2>
                <p>Formulário lateral para manter o catálogo limpo, moderno e operacional.</p>
              </div>
              <button type="button" className="iconButton" onClick={closeDrawer} aria-label="Fechar gaveta">
                <X size={18} />
              </button>
            </div>

            {error ? <div className="errorBanner">{error}</div> : null}

            <form className="drawerForm" onSubmit={submit}>
              <label>
                Nome do serviço
                <input required minLength={2} placeholder="Ex: Película automotiva premium" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>

              <label>
                Descrição
                <textarea placeholder="Descreva o serviço, material usado, garantia e observações comerciais." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>

              <div className="drawerTwoColumns">
                <label>
                  Valor base em R$
                  <input required placeholder="Ex: 350,00" value={form.priceReais} onChange={(event) => setForm({ ...form, priceReais: event.target.value })} />
                </label>
                <label>
                  Duração em minutos
                  <input required type="number" min={15} max={480} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
                </label>
              </div>

              <label className="checkLine">
                <input type="checkbox" checked={form.isPublic} onChange={(event) => setForm({ ...form, isPublic: event.target.checked })} />
                Aparecer no agendamento público
              </label>

              <label className="checkLine">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                Serviço ativo para operação
              </label>

              <div className="drawerActions">
                <button type="button" className="ghostButton" onClick={closeDrawer} disabled={saving}>Cancelar</button>
                <button type="submit" disabled={saving}>{saving ? 'Salvando...' : selectedService ? 'Salvar alterações' : 'Cadastrar serviço'}</button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
