import { useMemo, useState } from 'react';
import { CalendarPlus, Filter, LayoutGrid, List, Search } from 'lucide-react';
import { isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { matchesAppointment, STATUSES, TYPES } from '../lib/appointment';
import AppointmentCard from '../components/AppointmentCard';
import AppointmentModal from '../components/AppointmentModal';
import { ConfirmDialog, EmptyState, LoadingState, PageHeader } from '../components/UI';

export default function Appointments() {
  const { appointments, loading, deleteAppointment, updateAppointment } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [time, setTime] = useState('all');
  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();
  const filtered = useMemo(() => appointments.filter((item) => (!query || matchesAppointment(item, query)) && (status === 'all' || item.status === status) && (type === 'all' || item.type === type) && (time === 'all' || (time === 'upcoming') === isAfter(new Date(`${item.date}T${item.startTime}`), new Date()))), [appointments, query, status, type, time]);
  if (loading) return <LoadingState />;
  return <><PageHeader eyebrow="Workspace" title="Appointments" description={`${filtered.length} of ${appointments.length} appointments`} actions={<button className="button primary" onClick={() => navigate('/add')}><CalendarPlus /> Add appointment</button>} />
    <section className="filter-bar"><label className="search-control"><Search /><input aria-label="Search appointments" placeholder="Search title, person, company..." value={query} onChange={(e) => setQuery(e.target.value)} /></label><div className="filter-selects"><Filter /><select aria-label="Filter by time" value={time} onChange={(e) => setTime(e.target.value)}><option value="all">Any time</option><option value="upcoming">Upcoming</option><option value="past">Past</option></select><select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option>{TYPES.map((value) => <option key={value}>{value}</option>)}</select></div><div className="view-toggle"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List /></button><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid /></button></div></section>
    {filtered.length ? <div className={`appointments-${view}`}>{filtered.map((item) => <AppointmentCard key={item.id} appointment={item} onEdit={setEditing} onDelete={setDeleting} onComplete={(entry) => updateAppointment(entry.id, { status: 'completed' }, 'Marked complete')} />)}</div> : <EmptyState title="No appointments found" description="Try adjusting your filters or create a new appointment." action={<button className="button primary" onClick={() => navigate('/add')}>Create appointment</button>} />}
    {editing && <AppointmentModal appointment={editing} onClose={() => setEditing(null)} />}{deleting && <ConfirmDialog title="Delete appointment?" description={`This will permanently delete “${deleting.title}”.`} onCancel={() => setDeleting(null)} onConfirm={async () => { await deleteAppointment(deleting.id); setDeleting(null); }} />}</>;
}
