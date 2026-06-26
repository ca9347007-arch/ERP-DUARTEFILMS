import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, ExternalLink, MessageCircle, Phone, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Appointment } from '../types';

const labels: Record<string, string> = {
  PENDING: 'Aguardando',
  CONFIRMED: 'Confirmado',
  IN_SERVICE: 'Em atendimento',
  FINISHED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu'
};

const statusClass: Record<string, string> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_SERVICE: 'progress',
  FINISHED: 'finished',
  CANCELLED: 'canceled',
  NO_SHOW: 'canceled'
};

function dateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function dateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const formatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return `${isToday ? 'Hoje, ' : ''}${formatted}`;
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function durationLabel(startsAt: string, endsAt: string) {
  const diff = Math.max(15, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000));
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (!hours) return `${minutes} min`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

export function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data.appointments);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(id: string, status: string) {
    await api.patch(`/appointments/${id}/status`, { status });
    await load();
  }

  const groupedAppointments = useMemo(() => {
    const groups = appointments.reduce<Record<string, Appointment[]>>((acc, appointment) => {
      const key = dateKey(appointment.startsAt);
      acc[key] = acc[key] ?? [];
      acc[key].push(appointment);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, label: dateLabel(items[0].startsAt), items }));
  }, [appointments]);

  return (
    <section className="agendaPremiumModule">
      <div className="pageHeader premiumPageHeader">
        <div>
          <span className="eyebrow">Operação</span>
          <h1>Agenda interna</h1>
          <p>Acompanhamento de agendamentos públicos e internos com ação direta para orçamento e WhatsApp.</p>
        </div>
        <div className="agendaHeaderActions">
          <button type="button" className="ghostButton" onClick={load}><RefreshCcw size={16} /> Atualizar</button>
          <a className="button" href="/agendar" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir link público</a>
        </div>
      </div>

      <div className="agendaPremiumContainer">
        {loading ? (
          <div className="premiumEmptyState">
            <RefreshCcw size={42} />
            <strong>Carregando agenda...</strong>
            <p>Buscando os agendamentos internos e públicos.</p>
          </div>
        ) : groupedAppointments.length === 0 ? (
          <div className="premiumEmptyState">
            <ClipboardList size={46} />
            <strong>Nenhum agendamento encontrado.</strong>
            <p>Quando o cliente agendar pelo link público, ele aparecerá nesta linha do tempo.</p>
          </div>
        ) : (
          groupedAppointments.map((group) => (
            <div className="agendaDateGroup" key={group.key}>
              <div className="agendaDateHeader">
                <h3>{group.label}</h3>
                <div />
              </div>

              {group.items.map((appointment) => {
                const currentClass = statusClass[appointment.status] ?? 'pending';
                const isCancelled = appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW';
                const isFinished = appointment.status === 'FINISHED';
                const quoteUrl = `/orcamentos?clientId=${appointment.client.id}&serviceId=${appointment.service.id}&appointmentId=${appointment.id}`;

                return (
                  <article className={`appointmentTimelineCard status-${currentClass}`} key={appointment.id}>
                    <div className="appointmentTimeBlock">
                      <strong>{timeLabel(appointment.startsAt)}</strong>
                      <span>{durationLabel(appointment.startsAt, appointment.endsAt)}</span>
                    </div>

                    <div className="appointmentDivider" />

                    <div className="appointmentInfoBlock">
                      <strong>{appointment.client.name}</strong>
                      <span>{appointment.service.name}{appointment.vehicle ? ` • ${appointment.vehicle.brand ? `${appointment.vehicle.brand} ` : ''}${appointment.vehicle.model}${appointment.vehicle.year ? ` (${appointment.vehicle.year})` : ''}` : ''}</span>
                      {appointment.notes ? <small>{appointment.notes}</small> : null}
                    </div>

                    <div className="appointmentActionBlock">
                      <span className={`appointmentBadge ${currentClass}`}><i /> {labels[appointment.status] ?? appointment.status}</span>
                      <select value={appointment.status} onChange={(event) => changeStatus(appointment.id, event.target.value)}>
                        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button type="button" className="ghostButton compactAction" disabled={isCancelled} onClick={() => window.open(whatsappLink(appointment.client.phone), '_blank')}>
                        <Phone size={15} /> WhatsApp
                      </button>
                      <button type="button" className="quoteShortcutButton" disabled={isCancelled} onClick={() => navigate(quoteUrl)}>
                        <ClipboardList size={15} /> {isFinished ? 'Ver/gerar OS' : 'Criar orçamento'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
