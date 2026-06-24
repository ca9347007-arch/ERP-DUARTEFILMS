import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '../api/client';
import { Service } from '../types';

type PublicScheduleResponse = {
  protocol: string;
  message: string;
};

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit'
});

export function PublicScheduleForm({ onBack, onLookup }: { onBack?: () => void; onLookup?: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', model: '', plate: '', notes: '' });
  const [success, setSuccess] = useState<PublicScheduleResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.get('/public/services')
      .then((res) => {
        setServices(res.data.services);
        setServiceId(res.data.services[0]?.id ?? '');
      })
      .catch(() => setError('Não foi possível carregar os serviços públicos.'));
  }, []);

  useEffect(() => {
    if (!serviceId || !date) return;
    setStartsAt('');
    setLoadingSlots(true);
    api.get('/public/availability', { params: { serviceId, date } })
      .then((res) => setSlots(res.data.slots))
      .catch(() => {
        setSlots([]);
        setError('Não foi possível carregar os horários disponíveis.');
      })
      .finally(() => setLoadingSlots(false));
  }, [serviceId, date]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSuccess(null);
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/public/appointments', {
        serviceId,
        startsAt,
        client: { name: form.name, phone: form.phone, email: form.email },
        vehicle: { model: form.model, plate: form.plate },
        notes: form.notes
      });
      setSuccess({ protocol: res.data.protocol, message: res.data.message });
      setForm({ name: '', phone: '', email: '', model: '', plate: '', notes: '' });
      setStartsAt('');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Não foi possível solicitar o agendamento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="publicForm" onSubmit={submit}>
      <div className="brand large">
        <div className="brandMark">DF</div>
        <div>
          <strong>DuarteFilms</strong>
          <span>Agendamento online</span>
        </div>
      </div>

      <h1>Agende seu <span className="goldText">atendimento</span></h1>
      <p>Escolha serviço, data e horário. A equipe confirmará o atendimento pelo WhatsApp.</p>

      <label>
        Serviço
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          <option value="">Selecione o serviço...</option>
          {services.map((service) => (
            <option value={service.id} key={service.id}>
              {service.name} — {money(service.basePriceCents)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid two compact">
        <label>
          Data
          <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Horário
          <select value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required>
            <option value="">{loadingSlots ? 'Carregando...' : 'Selecione'}</option>
            {slots.map((slot) => (
              <option value={slot} key={slot}>{timeFormatter.format(new Date(slot))}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid two compact">
        <input placeholder="Seu nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" required />
        <input placeholder="E-mail opcional" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
        <input placeholder="Modelo do veículo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
        <input placeholder="Placa opcional" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} />
      </div>

      <textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />

      {error && <div className="alert">{error}</div>}
      {success && (
        <div className="success">
          <strong>{success.message}</strong>
          <span>Protocolo: {success.protocol}</span>
          <small>Guarde este código. Ele será usado para consultar o status sem entrar no sistema.</small>
        </div>
      )}

      <button disabled={loading || !startsAt}>{loading ? 'Enviando...' : 'Solicitar agendamento'}</button>

      <div className="publicActions">
        {onLookup && <button type="button" className="linkButton" onClick={onLookup}>Consultar agendamento</button>}
        {onBack && <button type="button" className="linkButton" onClick={onBack}>Voltar para o login</button>}
      </div>
    </form>
  );
}

export function PublicSchedule() {
  return (
    <div className="publicScreen">
      <div className="publicCard">
        <PublicScheduleForm />
        <a className="publicLink" href="/login">Voltar para o login</a>
      </div>
    </div>
  );
}
