import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '../api/client';
import { Service } from '../types';

export function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: '', description: '', basePriceCents: 0, durationMinutes: 60, isPublic: true, isActive: true });

  async function load() {
    const res = await api.get('/services');
    setServices(res.data.services);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.post('/services', form);
    setForm({ name: '', description: '', basePriceCents: 0, durationMinutes: 60, isPublic: true, isActive: true });
    await load();
  }

  return (
    <section>
      <div className="pageHeader"><div><span className="eyebrow">Catálogo</span><h1>Serviços</h1><p>Serviços usados no orçamento e no agendamento público.</p></div></div>
      <div className="grid two">
        <form className="card form" onSubmit={submit}>
          <h2>Novo serviço</h2>
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input type="number" placeholder="Preço em centavos" value={form.basePriceCents} onChange={(e) => setForm({ ...form, basePriceCents: Number(e.target.value) })} />
          <input type="number" placeholder="Duração em minutos" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
          <button>Cadastrar serviço</button>
        </form>
        <div className="card">
          <h2>Serviços ativos</h2>
          {services.map((service) => <div className="row" key={service.id}><div><strong>{service.name}</strong><span>{service.durationMinutes} min</span></div><span>{money(service.basePriceCents)}</span></div>)}
        </div>
      </div>
    </section>
  );
}
