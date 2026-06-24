import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Appointment } from '../types';

const labels: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_SERVICE: 'Em atendimento',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu'
};

export function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  async function load() {
    const res = await api.get('/appointments');
    setAppointments(res.data.appointments);
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(id: string, status: string) {
    await api.patch(`/appointments/${id}/status`, { status });
    await load();
  }

  return (
    <section>
      <div className="pageHeader"><div><span className="eyebrow">Operação</span><h1>Agenda interna</h1><p>Acompanhamento de agendamentos públicos e internos.</p></div><a className="button" href="/agendar" target="_blank">Abrir link público</a></div>
      <div className="card">
        <h2>Agendamentos</h2>
        {appointments.map((appointment) => (
          <div className="row" key={appointment.id}>
            <div>
              <strong>{new Date(appointment.startsAt).toLocaleString('pt-BR')} — {appointment.client.name}</strong>
              <span>{appointment.service.name} {appointment.vehicle ? `• ${appointment.vehicle.model}` : ''}</span>
            </div>
            <select value={appointment.status} onChange={(e) => changeStatus(appointment.id, e.target.value)}>
              {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
