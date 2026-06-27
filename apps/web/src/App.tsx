import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { CalendarDays, Car, ChartNoAxesCombined, ClipboardList, DollarSign, LogOut, Package, Settings as SettingsIcon, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from './api/client';
import { User } from './types';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Clients } from './pages/Clients';
import { Appointments } from './pages/Appointments';
import { PublicSchedule } from './pages/PublicSchedule';
import { PublicAppointmentLookup } from './pages/PublicAppointmentLookup';
import { Finance } from './pages/Finance';
import { Stock } from './pages/Stock';
import { Services } from './pages/Services';
import { Quotes } from './pages/Quotes';
import { Settings } from './pages/Settings';

function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const nav = [
    { to: '/', label: 'Dashboard', icon: ChartNoAxesCombined },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays },
    { to: '/servicos', label: 'Serviços', icon: Car },
    { to: '/orcamentos', label: 'Orçamentos/OS', icon: ClipboardList },
    { to: '/financeiro', label: 'Financeiro', icon: DollarSign },
    { to: '/estoque', label: 'Estoque', icon: Package },
    { to: '/configuracoes', label: 'Configurações', icon: SettingsIcon }
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">DF</div>
          <div>
            <strong>DuarteFilms</strong>
            <span>ERP Local</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `navItem ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="userBox">
          <strong>{user.name}</strong>
          <span>{user.role}</span>
          <button onClick={onLogout} className="ghostButton"><LogOut size={16} /> Sair</button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/agenda" element={<Appointments />} />
          <Route path="/servicos" element={<Services />} />
          <Route path="/orcamentos" element={<Quotes />} />
          <Route path="/financeiro" element={<Finance />} />
          <Route path="/estoque" element={<Stock />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await api.post('/auth/logout');
    setUser(null);
    navigate('/login');
  }

  if (loading) return <div className="centerScreen">Carregando ERP...</div>;

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={setUser} />} />
      <Route path="/agendar" element={<PublicSchedule />} />
      <Route path="/consultar-agendamento" element={<PublicAppointmentLookup />} />
      <Route path="/*" element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
    </Routes>
  );
}
