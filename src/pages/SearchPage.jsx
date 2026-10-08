import { useMemo, useState } from 'react';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { matchesAppointment, STATUSES, TYPES } from '../lib/appointment';
import AppointmentCard from '../components/AppointmentCard';
import AppointmentModal from '../components/AppointmentModal';
import { ConfirmDialog, EmptyState, PageHeader } from '../components/UI';

export default function SearchPage() {
  const { appointments, deleteAppointment } = useApp();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const results = useMemo(() => appointments.filter((item) => (!query || matchesAppointment(item, query)) && (type === 'all' || item.type === type) && (status === 'all' || item.status === status) && (!from || item.date >= from) && (!to || item.date <= to)), [appointments, query, type, status, from, to]);
  return <><PageHeader eyebrow="Find anything" title="Search appointments" description="Search across people, companies, locations, notes and appointment details." />
    <section className="search-hero"><label><SearchIcon /><input autoFocus aria-label="Search all appointments" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try a name, company, location or note..." /></label></section>
    <section className="advanced-filters"><span><SlidersHorizontal /> Refine</span><label>Type<select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><button className="text-button" onClick={() => { setQuery(''); setType('all'); setStatus('all'); setFrom(''); setTo(''); }}>Clear all</button></section>
    <div className="result-count"><strong>{results.length}</strong> result{results.length === 1 ? '' : 's'}</div>{results.length ? <div className="appointments-list">{results.map((item) => <AppointmentCard key={item.id} appointment={item} onEdit={setEditing} onDelete={setDeleting} />)}</div> : <EmptyState icon={SearchIcon} title="No matching appointments" description="Try fewer filters or a broader search term." />}{editing && <AppointmentModal appointment={editing} onClose={() => setEditing(null)} />}{deleting && <ConfirmDialog title="Delete appointment?" description={`Permanently remove “${deleting.title}”?`} onCancel={() => setDeleting(null)} onConfirm={async () => { await deleteAppointment(deleting.id); setDeleting(null); }} />}</>;
}
