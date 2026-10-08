import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, CalendarPlus, ChartNoAxesCombined, CircleHelp, Clock3, LayoutDashboard, LogOut, Menu, Moon, Search, Settings, Sun, UserRound, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import AppointmentModal from './AppointmentModal';
import { Toasts } from './UI';

const links = [
  ['/', 'Dashboard', LayoutDashboard], ['/calendar', 'Calendar', CalendarDays], ['/appointments', 'Appointments', Clock3],
  ['/add', 'Add Appointment', CalendarPlus], ['/reports', 'Reports', ChartNoAxesCombined], ['/reminders', 'Reminders', Bell],
  ['/search', 'Search', Search], ['/settings', 'Settings', Settings], ['/help', 'Help', CircleHelp],
];

export default function Shell() {
  const { user, logout } = useAuth();
  const { appointments, settings, saveSettings } = useApp();
  const [now, setNow] = useState(new Date());
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const upcomingCount = appointments.filter((item) => !['completed', 'cancelled'].includes(item.status) && new Date(`${item.date}T${item.startTime}`) > now).length;

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => setNavOpen(false), [location.pathname]);

  return <div className="app-shell">
    <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><CalendarDays /></span><div><strong>Suresh</strong><span>Appointment App</span></div><button className="icon-button mobile-close" onClick={() => setNavOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Main navigation">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label}</span>{label === 'Reminders' && upcomingCount > 0 && <b>{upcomingCount}</b>}</NavLink>)}</nav>
      <div className="sidebar-footer"><button onClick={logout}><LogOut /><span>Logout</span></button><p>Plan thoughtfully.<br />Meet meaningfully.</p></div>
    </aside>
    {navOpen && <button className="nav-scrim" onClick={() => setNavOpen(false)} aria-label="Close navigation" />}
    <main className="main-shell">
      <header className="topbar">
        <button className="icon-button menu-toggle" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Menu /></button>
        <div className="live-date"><CalendarDays /><div><strong>{format(now, 'EEEE, dd/MMM/yyyy')}</strong><span>{format(now, 'h:mm a')} · Your schedule, at a glance</span></div></div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => saveSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} aria-label="Toggle color theme">{settings.theme === 'dark' ? <Sun /> : <Moon />}</button>
          <button className="icon-button notification-button" onClick={() => navigate('/reminders')} aria-label={`${upcomingCount} upcoming appointments`}><Bell />{upcomingCount > 0 && <span>{Math.min(upcomingCount, 9)}</span>}</button>
          <div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen(!profileOpen)}><span>{user?.name?.slice(0, 1).toUpperCase()}</span><div><strong>{user?.name}</strong><small>{user?.email}</small></div></button>{profileOpen && <div className="profile-menu"><button onClick={() => navigate('/settings')}><Settings /> Settings</button><button onClick={logout}><LogOut /> Logout</button></div>}</div>
        </div>
      </header>
      <div className="page-content"><Outlet /></div>
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{links.slice(0, 4).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label === 'Add Appointment' ? 'Add' : label}</span></NavLink>)}<button onClick={() => setNavOpen(true)}><Menu /><span>More</span></button></nav>
    {location.pathname === '/add' && <AppointmentModal onClose={() => navigate('/appointments')} />}
    <Toasts />
  </div>;
}
