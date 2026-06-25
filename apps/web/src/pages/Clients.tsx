import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Car, ClipboardList, Mail, MessageCircle, Pencil, Plus, Search, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Client } from '../types';

type ClientForm = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm: ClientForm = {
  name: '',
  phone: '',
  email: '',
  notes: ''
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'DF';
}

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

export function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/clients');
      setClients(res.data.clients);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) => {
      const vehicleText = client.vehicles?.map((vehicle) => `${vehicle.brand ?? ''} ${vehicle.model} ${vehicle.plate ?? ''}`).join(' ') ?? '';
      return [client.name, client.phone, client.email ?? '', client.notes ?? '', vehicleText]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [clients, search]);

  const totalVehicles = clients.reduce((total, client) => total + (client.vehicles?.length ?? 0), 0);
  const clientsWithEmail = clients.filter((client) => Boolean(client.email)).length;
  const clientsWithVehicle = clients.filter((client) => (client.vehicles?.length ?? 0) > 0).length;

  function openCreateDrawer() {
    setSelectedClient(null);
    setForm(emptyForm);
    setError(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(client: Client) {
    setSelectedClient(client);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email ?? '',
      notes: client.notes ?? ''
    });
    setError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (saving) return;
    setDrawerOpen(false);
    setSelectedClient(null);
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
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim()
      };

      if (selectedClient) {
        await api.patch(`/clients/${selectedClient.id}`, payload);
      } else {
        await api.post('/clients', payload);
      }

      await load();
      closeDrawer();
    } catch {
      setError('Não foi possível salvar o cliente. Verifique nome, WhatsApp e e-mail.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="premiumModule">
      <div className="pageHeader premiumPageHeader">
        <div>
          <span className="eyebrow">CRM visual</span>
          <h1>Clientes</h1>
          <p>Base comercial com clientes, WhatsApp, veículos e histórico operacional.</p>
        </div>
        <button type="button" className="premiumAction" onClick={openCreateDrawer}>
          <Plus size={18} /> Novo cliente
        </button>
      </div>

      <div className="clientStatsGrid">
        <div className="miniMetricCard">
          <span>Clientes ativos</span>
          <strong>{clients.length}</strong>
          <small>Base atual do CRM</small>
        </div>
        <div className="miniMetricCard">
          <span>Com veículo</span>
          <strong>{clientsWithVehicle}</strong>
          <small>Prontos para orçamento/OS</small>
        </div>
        <div className="miniMetricCard">
          <span>Veículos cadastrados</span>
          <strong>{totalVehicles}</strong>
          <small>Histórico por cliente</small>
        </div>
        <div className="miniMetricCard">
          <span>Com e-mail</span>
          <strong>{clientsWithEmail}</strong>
          <small>Contato complementar</small>
        </div>
      </div>

      <div className="moduleToolbar">
        <label className="searchField" aria-label="Pesquisar clientes">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por nome, WhatsApp, e-mail, veículo ou placa"
          />
        </label>
        <span className="toolbarHint">{filteredClients.length} resultado(s)</span>
      </div>

      <div className="crmGrid">
        {loading ? (
          <div className="premiumEmptyState">
            <UserRound size={42} />
            <strong>Carregando clientes...</strong>
            <p>Buscando a base comercial da DuarteFilms.</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="premiumEmptyState">
            <UserRound size={46} />
            <strong>Nenhum cliente por aqui ainda.</strong>
            <p>Clique em <b>Novo cliente</b> para iniciar o CRM visual.</p>
            <button type="button" onClick={openCreateDrawer}><Plus size={18} /> Novo cliente</button>
          </div>
        ) : (
          filteredClients.map((client) => (
            <article className="clientCard" key={client.id}>
              <div className="clientCardTop">
                <div className="clientAvatar">{initials(client.name)}</div>
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.email || 'Sem e-mail cadastrado'}</span>
                </div>
                <button type="button" className="iconButton" onClick={() => openEditDrawer(client)} aria-label={`Editar ${client.name}`}>
                  <Pencil size={16} />
                </button>
              </div>

              <div className="clientContactRow">
                <a href={whatsappLink(client.phone)} target="_blank" rel="noreferrer" className="contactPill whatsappPill">
                  <MessageCircle size={16} /> {client.phone}
                </a>
                {client.email ? (
                  <a href={`mailto:${client.email}`} className="contactPill">
                    <Mail size={16} /> E-mail
                  </a>
                ) : null}
              </div>

              <div className="clientMetaGrid">
                <div>
                  <span>Veículos</span>
                  <strong>{client.vehicles?.length ?? 0}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>Ativo</strong>
                </div>
              </div>

              {client.vehicles?.length ? (
                <div className="vehiclePreview">
                  <Car size={16} />
                  <span>{client.vehicles[0].brand ? `${client.vehicles[0].brand} ` : ''}{client.vehicles[0].model}{client.vehicles[0].plate ? ` • ${client.vehicles[0].plate}` : ''}</span>
                </div>
              ) : (
                <div className="vehiclePreview mutedPreview">
                  <Car size={16} />
                  <span>Nenhum veículo vinculado ainda</span>
                </div>
              )}

              <div className="clientQuickActions">
                <button
                  type="button"
                  className="quoteShortcutButton"
                  onClick={() => navigate(`/orcamentos?clientId=${client.id}`)}
                >
                  <ClipboardList size={16} /> Criar orçamento
                </button>
              </div>

              {client.notes ? <p className="clientNotes">{client.notes}</p> : null}
            </article>
          ))
        )}
      </div>

      {drawerOpen ? (
        <div className="drawerBackdrop" role="presentation" onMouseDown={closeDrawer}>
          <aside className="sideDrawer" role="dialog" aria-modal="true" aria-label={selectedClient ? 'Editar cliente' : 'Novo cliente'} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader">
              <div>
                <span className="eyebrow">{selectedClient ? 'Editar cadastro' : 'Novo cadastro'}</span>
                <h2>{selectedClient ? selectedClient.name : 'Novo cliente'}</h2>
                <p>Formulário em gaveta lateral para manter a lista limpa e premium.</p>
              </div>
              <button type="button" className="iconButton" onClick={closeDrawer} aria-label="Fechar gaveta">
                <X size={18} />
              </button>
            </div>

            {error ? <div className="errorBanner">{error}</div> : null}

            <form className="drawerForm" onSubmit={submit}>
              <label>
                Nome do cliente
                <input required minLength={2} placeholder="Ex: Carlos Alberto" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>

              <label>
                WhatsApp
                <input required minLength={8} placeholder="Ex: (81) 99999-0000" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>

              <label>
                E-mail opcional
                <input type="email" placeholder="cliente@email.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>

              <label>
                Observações
                <textarea placeholder="Histórico, preferências, retorno, indicação ou qualquer observação comercial." value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>

              <div className="drawerActions">
                <button type="button" className="ghostButton" onClick={closeDrawer} disabled={saving}>Cancelar</button>
                <button type="submit" disabled={saving}>{saving ? 'Salvando...' : selectedClient ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
