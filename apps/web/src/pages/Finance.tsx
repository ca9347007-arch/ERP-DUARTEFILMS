import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '../api/client';
import { FinancialEntry } from '../types';

export function Finance() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [form, setForm] = useState({ type: 'REVENUE', description: '', category: '', amountCents: 0, paymentMethod: 'PIX_MANUAL', status: 'PENDING' });

  async function load() {
    const res = await api.get('/financial-entries');
    setEntries(res.data.entries);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.post('/financial-entries', form);
    setForm({ type: 'REVENUE', description: '', category: '', amountCents: 0, paymentMethod: 'PIX_MANUAL', status: 'PENDING' });
    await load();
  }

  return (
    <section>
      <div className="pageHeader"><div><span className="eyebrow">Caixa</span><h1>Financeiro manual</h1><p>Receitas, despesas, contas a receber e contas a pagar sem integração bancária.</p></div></div>
      <div className="grid two">
        <form className="card form" onSubmit={submit}>
          <h2>Novo lançamento</h2>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="REVENUE">Receita</option><option value="EXPENSE">Despesa</option></select>
          <input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input type="number" placeholder="Valor em centavos" value={form.amountCents} onChange={(e) => setForm({ ...form, amountCents: Number(e.target.value) })} />
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="PIX_MANUAL">Pix manual</option><option value="CASH">Dinheiro</option><option value="CARD">Cartão</option><option value="TRANSFER">Transferência</option><option value="OTHER">Outro</option></select>
          <button>Lançar</button>
        </form>
        <div className="card">
          <h2>Lançamentos</h2>
          {entries.map((entry) => <div className="row" key={entry.id}><div><strong>{entry.description}</strong><span>{entry.category} • {entry.type === 'REVENUE' ? 'Receita' : 'Despesa'}</span></div><span>{money(entry.amountCents)}</span></div>)}
        </div>
      </div>
    </section>
  );
}
