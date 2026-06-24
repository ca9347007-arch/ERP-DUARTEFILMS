import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { User } from '../types';
import { PublicScheduleForm } from './PublicSchedule';
import { PublicAppointmentLookupForm } from './PublicAppointmentLookup';

type AuthPanel = 'login' | 'schedule' | 'lookup';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [panel, setPanel] = useState<AuthPanel>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      onLogin(res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginScreen">
      <div className="authScene">
        <div className={`authCard mode-${panel}`}>
          <section className="authFace authFaceFront">
            <form className="publicForm" onSubmit={submit}>
              <div className="brand large">
                <div className="brandMark">DF</div>
                <div>
                  <strong>DuarteFilms ERP</strong>
                  <span>Acesso premium</span>
                </div>
              </div>

              <h1>Entrar no <span className="goldText">painel</span></h1>
              <p>Acesse a área administrativa ou use os serviços públicos de agendamento.</p>

              <label>
                E-mail
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  type="email"
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                Senha
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error && <div className="alert">{error}</div>}
              <button disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>

              <div className="portalOptions">
                <button type="button" className="portalOption" onClick={() => setPanel('schedule')}>
                  <strong>Agendar atendimento</strong>
                  <span>Cliente solicita horário sem login</span>
                </button>
                <button type="button" className="portalOption" onClick={() => setPanel('lookup')}>
                  <strong>Consultar agendamento</strong>
                  <span>Consulta por protocolo e WhatsApp</span>
                </button>
              </div>
            </form>
          </section>

          <section className="authFace authFaceSchedule">
            <PublicScheduleForm onBack={() => setPanel('login')} onLookup={() => setPanel('lookup')} />
          </section>

          <section className="authFace authFaceLookup">
            <PublicAppointmentLookupForm onBack={() => setPanel('login')} onSchedule={() => setPanel('schedule')} />
          </section>
        </div>
      </div>
    </div>
  );
}
