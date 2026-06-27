import { FormEvent, useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../api/client';
import { CompanySettings } from '../types';

const defaultForm: CompanySettings = {
  fantasyName: 'DuarteFilms',
  legalName: '',
  document: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  state: '',
  defaultQuoteValidityDays: 7,
  quoteWarrantyText: 'Garantia conforme linha de película e serviço contratado.',
  quotePaymentText: 'Pagamento via PIX manual, dinheiro, cartão ou transferência.',
  businessHours: 'Segunda a sábado, das 08h �s 18h.'
};

export function Settings() {
  const [form, setForm] = useState<CompanySettings>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/settings/company').then((res) => setForm({ ...defaultForm, ...res.data.settings }));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await api.patch('/settings/company', {
        ...form,
        defaultQuoteValidityDays: Number(form.defaultQuoteValidityDays || 7)
      });
      setForm({ ...defaultForm, ...res.data.settings });
      setMessage('Configurações salvas com sucesso. Os pr�ximos orçamentos j� puxam estes dados.');
    } catch {
      setMessage('Não foi poss�vel salvar. Verifique nome, e-mail e dados obrigat�rios.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="premiumModule settingsModule">
      <div className="pageHeader premiumPageHeader">
        <div>
          <span className="eyebrow">Base do ERP</span>
          <h1>Configurações</h1>
          <p>Dados da empresa, textos padr�o e informa��es que aparecem no orçamento.</p>
        </div>
      </div>

      <form className="settingsGrid" onSubmit={submit}>
        <div className="settingsCard">
          <div className="settingsCardTitle"><SettingsIcon size={18} /><h2>Dados da empresa</h2></div>
          <label>Nome fantasia<input required minLength={2} value={form.fantasyName} onChange={(event) => setForm({ ...form, fantasyName: event.target.value })} /></label>
          <label>Raz�o social<input value={form.legalName ?? ''} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></label>
          <label>CNPJ/CPF<input value={form.document ?? ''} onChange={(event) => setForm({ ...form, document: event.target.value })} /></label>
          <div className="drawerTwoColumns"><label>Telefone<input value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>WhatsApp<input value={form.whatsapp ?? ''} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></label></div>
          <label>E-mail<input type="email" value={form.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        </div>

        <div className="settingsCard">
          <div className="settingsCardTitle"><SettingsIcon size={18} /><h2>Endere�o e operação</h2></div>
          <label>Endere�o<input value={form.address ?? ''} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <div className="drawerTwoColumns"><label>Cidade<input value={form.city ?? ''} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label>UF<input maxLength={2} value={form.state ?? ''} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} /></label></div>
          <label>Horário de funcionamento<input value={form.businessHours ?? ''} onChange={(event) => setForm({ ...form, businessHours: event.target.value })} /></label>
          <label>Validade padr�o do orçamento em dias<input type="number" min={1} max={90} value={form.defaultQuoteValidityDays} onChange={(event) => setForm({ ...form, defaultQuoteValidityDays: Number(event.target.value) })} /></label>
        </div>

        <div className="settingsCard wideSettingsCard">
          <div className="settingsCardTitle"><SettingsIcon size={18} /><h2>Texto do orçamento</h2></div>
          <label>Condi��es de pagamento<textarea value={form.quotePaymentText ?? ''} onChange={(event) => setForm({ ...form, quotePaymentText: event.target.value })} /></label>
          <label>Termos e garantia<textarea value={form.quoteWarrantyText ?? ''} onChange={(event) => setForm({ ...form, quoteWarrantyText: event.target.value })} /></label>
          {message ? <div className="infoBanner">{message}</div> : null}
          <div className="drawerActions"><button type="submit" disabled={saving}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar configurações'}</button></div>
        </div>
      </form>
    </section>
  );
}
