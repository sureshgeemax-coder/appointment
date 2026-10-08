import { useState } from 'react';
import { AlertCircle, ArrowRight, CalendarCheck, CalendarPlus, CheckCircle2, Clock3, Rocket, Sparkles, TrendingUp, UserRoundSearch, UsersRound } from 'lucide-react';
import { endOfWeek, format, isAfter, isSameDay, isThisMonth, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { formatDisplayDate } from '../lib/appointment';
import AppointmentCard from '../components/AppointmentCard';
import AppointmentModal from '../components/AppointmentModal';
import { ConfirmDialog, EmptyState, LoadingState } from '../components/UI';

export default function Dashboard() {
  const { user } = useAuth();
  const { appointments, loading, deleteAppointment, updateAppointment } = useApp();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();
  if (loading) return <LoadingState />;
  const today = appointments.filter((item) => isSameDay(parseISO(item.date), new Date()));
  const upcoming = appointments.filter((item) => isAfter(new Date(`${item.date}T${item.startTime}`), new Date()) && !['cancelled', 'completed'].includes(item.status)).slice(0, 4);
  const thisWeek = appointments.filter((item) => isWithinInterval(parseISO(item.date), { start: startOfWeek(new Date()), end: endOfWeek(new Date()) }));
  const thisMonth = appointments.filter((item) => isThisMonth(parseISO(item.date)));
  const important = appointments.filter((item) => item.type === 'Important Meeting');
  const interviews = appointments.filter((item) => item.type === 'Interview');
  const deployments = appointments.filter((item) => item.type === 'Deployment');
  const completed = appointments.filter((item) => item.status === 'completed').length;
  const pending = appointments.filter((item) => !['completed', 'cancelled'].includes(item.status)).length;

  return <>
    <section className="dashboard-hero"><div><span className="eyebrow light"><Sparkles /> Today’s workspace</span><h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}.</h1><p>{today.length ? `You have ${today.length} appointment${today.length === 1 ? '' : 's'} today. Here’s what deserves your attention.` : 'Your day is open. A little space can be a powerful thing.'}</p><button className="button white" onClick={() => navigate('/add')}><CalendarPlus /> Add appointment</button></div><div className="hero-date"><span>{format(new Date(), 'MMMM')}</span><strong>{format(new Date(), 'dd')}</strong><small>{format(new Date(), 'EEEE')}</small></div></section>
    <section className="metrics-grid">
      <button className="metric-card" onClick={() => navigate('/appointments')}><span className="metric-icon teal"><CalendarCheck /></span><div><small>Today</small><strong>{today.length}</strong><p>scheduled appointments</p></div><TrendingUp /></button>
      <button className="metric-card" onClick={() => navigate('/reminders')}><span className="metric-icon amber"><Clock3 /></span><div><small>Coming up</small><strong>{upcoming.length}</strong><p>need your attention</p></div><ArrowRight /></button>
      <button className="metric-card" onClick={() => navigate('/reports')}><span className="metric-icon violet"><CalendarCheck /></span><div><small>This week</small><strong>{thisWeek.length}</strong><p>weekly appointments</p></div><TrendingUp /></button>
      <button className="metric-card" onClick={() => navigate('/reports')}><span className="metric-icon blue"><UsersRound /></span><div><small>This month</small><strong>{thisMonth.length}</strong><p>monthly appointments</p></div><ArrowRight /></button>
      <button className="metric-card" onClick={() => navigate('/search')}><span className="metric-icon amber"><AlertCircle /></span><div><small>Important</small><strong>{important.length}</strong><p>important meetings</p></div><ArrowRight /></button>
      <button className="metric-card" onClick={() => navigate('/search')}><span className="metric-icon violet"><UserRoundSearch /></span><div><small>Interviews</small><strong>{interviews.length}</strong><p>interview appointments</p></div><ArrowRight /></button>
      <button className="metric-card" onClick={() => navigate('/search')}><span className="metric-icon blue"><Rocket /></span><div><small>Deployments</small><strong>{deployments.length}</strong><p>deployment events</p></div><ArrowRight /></button>
      <button className="metric-card" onClick={() => navigate('/reports')}><span className="metric-icon teal"><CheckCircle2 /></span><div><small>Completed / Pending</small><strong>{completed} / {pending}</strong><p>appointment progress</p></div><TrendingUp /></button>
    </section>
    <div className="dashboard-columns"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Today</span><h2>Your agenda</h2></div><button className="text-button" onClick={() => navigate('/calendar')}>View calendar <ArrowRight /></button></div>{today.length ? <div className="card-list">{today.map((item) => <AppointmentCard key={item.id} appointment={item} compact onEdit={setEditing} onDelete={setDeleting} onComplete={(entry) => updateAppointment(entry.id, { status: 'completed' }, 'Marked complete')} />)}</div> : <EmptyState title="A clear day ahead" description="No appointments are scheduled today." action={<button className="button secondary" onClick={() => navigate('/add')}>Plan something</button>} />}</section>
      <section className="panel focus-panel"><div className="panel-heading"><div><span className="eyebrow">Next up</span><h2>Upcoming</h2></div></div>{upcoming.length ? <div className="upcoming-list">{upcoming.map((item) => <button key={item.id} onClick={() => setEditing(item)}><span className={`priority-dot ${item.priority}`} /><div><strong>{item.title}</strong><small>{formatDisplayDate(item.date)} · {item.startTime}{item.meetingWith && ` · ${item.meetingWith}`}</small></div><ArrowRight /></button>)}</div> : <EmptyState title="Nothing on the horizon" description="Your upcoming schedule is clear." />}</section></div>
    {editing && <AppointmentModal appointment={editing} onClose={() => setEditing(null)} />}
    {deleting && <ConfirmDialog title="Delete appointment?" description={`“${deleting.title}” will be permanently removed.`} onCancel={() => setDeleting(null)} onConfirm={async () => { await deleteAppointment(deleting.id); setDeleting(null); }} />}
  </>;
}
