import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '../api/client';
import { Product } from '../types';

export function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: '', brand: '', type: '', shade: '', unit: 'm', costCents: 0, stockQuantity: 0, minStock: 0 });

  async function load() {
    const res = await api.get('/products');
    setProducts(res.data.products);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.post('/products', form);
    setForm({ name: '', brand: '', type: '', shade: '', unit: 'm', costCents: 0, stockQuantity: 0, minStock: 0 });
    await load();
  }

  return (
    <section>
      <div className="pageHeader"><div><span className="eyebrow">Materiais</span><h1>Estoque de películas</h1><p>Produtos, estoque mínimo, custo e movimentações.</p></div></div>
      <div className="grid two">
        <form className="card form" onSubmit={submit}>
          <h2>Novo produto</h2>
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input placeholder="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <input placeholder="Tonalidade" value={form.shade} onChange={(e) => setForm({ ...form, shade: e.target.value })} />
          <input type="number" placeholder="Estoque atual" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })} />
          <input type="number" placeholder="Estoque mínimo" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
          <input type="number" placeholder="Custo em centavos" value={form.costCents} onChange={(e) => setForm({ ...form, costCents: Number(e.target.value) })} />
          <button>Cadastrar produto</button>
        </form>
        <div className="card">
          <h2>Produtos cadastrados</h2>
          {products.map((product) => <div className="row" key={product.id}><div><strong>{product.name}</strong><span>{product.brand || 'sem marca'} • custo {money(product.costCents)}</span></div><span>{String(product.stockQuantity)} {product.unit}</span></div>)}
        </div>
      </div>
    </section>
  );
}
