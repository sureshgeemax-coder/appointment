import { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { endOfDay, endOfMonth, endOfWeek, format, isWithinInterval, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { TYPES, formatDisplayDate, typeClassName } from '../lib/appointment';
import { exportCsv, exportPdf, exportXlsx } from '../lib/exports';
import { EmptyState, PageHeader } from '../components/UI';

export default function ReportsPage() {
  const { appointments } = useApp();
  const { token } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const range = period === 'daily' ? [startOfDay(new Date()), endOfDay(new Date())] : period === 'weekly' ? [startOfWeek(new Date()), endOfWeek(new Date())] : period === 'monthly' ? [startOfMonth(new Date()), endOfMonth(new Date())] : [startOfDay(parseISO(from)), endOfDay(parseISO(to))];
  const data = useMemo(() => appointments.filter((item) => isWithinInterval(parseISO(item.date), { start: range[0], end: range[1] }) && (type === 'all' || item.type === type)), [appointments, period, type, from, to]);
  const statusCounts = ['scheduled', 'confirmed', 'completed', 'cancelled'].map((status) => ({ status, count: data.filter((item) => item.status === status).length }));
  const max = Math.max(1, ...statusCounts.map((item) => item.count));
  const completed = data.filter((item) => item.status === 'completed').length;
  return <><PageHeader eyebrow="Insights" title="Reports" description="Understand your schedule, then take your data anywhere." actions={<div className="export-menu"><button className="button secondary"><Download /> Export</button><div><button onClick={() => exportCsv(data)}><Sheet /> CSV</button><button onClick={() => exportXlsx({ from: format(range[0], 'yyyy-MM-dd'), to: format(range[1], 'yyyy-MM-dd'), type }, token)}><FileSpreadsheet /> Excel</button><button onClick={() => exportPdf(data)}><FileText /> PDF</button></div></div>} />
    <section className="report-controls"><div className="segmented">{['daily', 'weekly', 'monthly', 'custom'].map((item) => <button className={period === item ? 'active' : ''} onClick={() => setPeriod(item)} key={item}>{item}</button>)}</div>{period === 'custom' && <div className="date-range"><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><span>to</span><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>}<label className="type-filter">Appointment type<select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></label></section>
    <section className="report-summary"><div><small>Total appointments</small><strong>{data.length}</strong><span>{formatDisplayDate(range[0])} - {formatDisplayDate(range[1])}</span></div><div><small>Completed</small><strong>{completed}</strong><span>{data.length ? Math.round(completed / data.length * 100) : 0}% completion rate</span></div><div><small>People met</small><strong>{new Set(data.map((item) => item.email || item.meetingWith).filter(Boolean)).size}</strong><span>unique contacts</span></div><div><small>Scheduled hours</small><strong>{(data.reduce((sum, item) => sum + (Number(item.endTime?.split(':')[0] || 0) * 60 + Number(item.endTime?.split(':')[1] || 0) - Number(item.startTime?.split(':')[0] || 0) * 60 - Number(item.startTime?.split(':')[1] || 0)), 0) / 60).toFixed(1)}</strong><span>hours invested</span></div></section>
    <div className="report-grid"><section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">Breakdown</span><h2>Appointment status</h2></div><BarChart3 /></div>{data.length ? <div className="bar-chart">{statusCounts.map((item) => <div key={item.status}><span>{item.status}</span><div><i style={{ width: `${item.count / max * 100}%` }} /></div><strong>{item.count}</strong></div>)}</div> : <EmptyState title="No report data" description="No appointments match this period and type." />}</section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Types</span><h2>Where time goes</h2></div></div><div className="type-breakdown">{TYPES.map((item) => { const count = data.filter((entry) => entry.type === item).length; return count ? <div key={item}><span className={`type-swatch ${typeClassName(item)}`} /><span>{item}</span><strong>{count}</strong></div> : null; })}</div></section></div>
  </>;
}
