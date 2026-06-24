import { FormEvent, useState } from 'react';
import { api } from '../api/client';

type PublicLookupResult = {
  protocol: string;
  status: string;
  statusLabel: string;
  service: string;
  startsAt: string;
  endsAt: string;
  vehicle?: {
    model?: string | null;
    plate?: string | null;
  } | null;
  customerName?: string | null;
  message: string;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

export function PublicAppointmentLookupForm({ onBack, onSchedule }: { onBack?: () => void; onSchedule?: () => void }) {
  const [protocol, setProtocol] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<PublicLookupResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/public/appointments/lookup', { protocol, phone });
      setResult(res.data.appointment);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Não foi possível consultar este agendamento.');
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
          <span>Consulta pública</span>
        </div>
      </div>

      <h1>Consultar <span className="goldText">agendamento</span></h1>
      <p>Informe o protocolo recebido no agendamento e o WhatsApp cadastrado.</p>

      <label>
        Protocolo
        <input
          value={protocol}
          onChange={(e) => setProtocol(e.target.value.toUpperCase())}
          placeholder="DF-20260623-8F3A"
          autoComplete="off"
          required
        />
      </label>

      <label>
        WhatsApp
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(81) 99999-9999"
          inputMode="tel"
          required
        />
      </label>

      {error && <div className="alert">{error}</div>}

      {result && (
        <div className="lookupResult">
          <div>
            <span>Status</span>
            <strong>{result.statusLabel}</strong>
          </div>
          <div>
            <span>Protocolo</span>
            <strong>{result.protocol}</strong>
          </div>
          <div>
            <span>Serviço</span>
            <strong>{result.service}</strong>
          </div>
          <div>
            <span>Data e horário</span>
            <strong>{dateFormatter.format(new Date(result.startsAt))}</strong>
          </div>
          {result.vehicle?.model && (
            <div>
              <span>Veículo</span>
              <strong>{result.vehicle.model}{result.vehicle.plate ? ` • ${result.vehicle.plate}` : ''}</strong>
            </div>
          )}
          <p>{result.message}</p>
        </div>
      )}

      <button disabled={loading || !protocol || !phone}>{loading ? 'Consultando...' : 'Consultar agendamento'}</button>

      <div className="publicActions">
        {onSchedule && <button type="button" className="linkButton" onClick={onSchedule}>Agendar novo atendimento</button>}
        {onBack && <button type="button" className="linkButton" onClick={onBack}>Voltar para o login</button>}
      </div>
    </form>
  );
}

export function PublicAppointmentLookup() {
  return (
    <div className="publicScreen">
      <div className="publicCard publicCardCompact">
        <PublicAppointmentLookupForm />
        <a className="publicLink" href="/login">Voltar para o login</a>
      </div>
    </div>
  );
}
