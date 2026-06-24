import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Client } from '../types';

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  async function load() {
    const res = await api.get('/clients');
    setClients(res.data.clients);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.post('/clients', form);
    setForm({ name: '', phone: '', email: '', notes: '' });
    await load();
  }

  return (
    <section>
      <div className="pageHeader"><div><span className="eyebrow">CRM básico</span><h1>Clientes e veículos</h1><p>Cadastro centralizado para histórico e atendimentos.</p></div></div>
      <div className="grid two">
        <form className="card form" onSubmit={submit}>
          <h2>Novo cliente</h2>
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="E-mail opcional" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button>Cadastrar cliente</button>
        </form>
        <div className="card">
          <h2>Clientes cadastrados</h2>
          {clients.map((client) => (
            <div className="row" key={client.id}>
              <div><strong>{client.name}</strong><span>{client.phone}</span></div>
              <span>{client.email || 'sem e-mail'}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
