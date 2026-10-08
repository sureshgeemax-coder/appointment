import { useMemo, useState } from 'react';
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import AppointmentModal from '../components/AppointmentModal';
import { EmptyState, LoadingState, PageHeader } from '../components/UI';
import { typeClassName } from '../lib/appointment';

const views = ['Month', 'Week', 'Day', 'Agenda'];

function CalendarItem({ item, onEdit }) {
  return <button draggable onDragStart={(event) => event.dataTransfer.setData('text/appointment-id', item.id)} onClick={(event) => { event.stopPropagation(); onEdit(item); }} className={`calendar-item ${typeClassName(item.type)}`} title={`${item.title}, ${item.startTime}`}><span>{item.startTime}</span>{item.title}</button>;
}

export default function CalendarPage() {
  const { appointments, loading, updateAppointment, toast } = useApp();
  const [view, setView] = useState('Month');
  const [cursor, setCursor] = useState(new Date());
  const [editing, setEditing] = useState(null);
  const [addingDate, setAddingDate] = useState(null);
  const monday = true;
  const weekStart = startOfWeek(cursor, { weekStartsOn: monday ? 1 : 0 });
  const monthDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(cursor, { weekStartsOn: 1 }) });
  const visibleDays = view === 'Month' ? monthDays : view === 'Week' ? weekDays : [cursor];
  const itemsByDate = useMemo(() => Object.groupBy ? Object.groupBy(appointments, (item) => item.date) : appointments.reduce((acc, item) => ({ ...acc, [item.date]: [...(acc[item.date] || []), item] }), {}), [appointments]);
  if (loading) return <LoadingState label="Building your calendar" />;

  const move = (direction) => setCursor((current) => view === 'Month' ? (direction > 0 ? addMonths(current, 1) : subMonths(current, 1)) : view === 'Week' ? (direction > 0 ? addWeeks(current, 1) : subWeeks(current, 1)) : direction > 0 ? addDays(current, 1) : subDays(current, 1));
  const dropOn = async (event, date) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/appointment-id');
    const item = appointments.find((entry) => entry.id === id);
    const nextDate = format(date, 'yyyy-MM-dd');
    if (!item || item.date === nextDate) return;
    try { await updateAppointment(id, { date: nextDate }, `Rescheduled to ${format(date, 'MMM d')}`); } catch (error) { toast(error.message, 'error'); }
  };

  return <><PageHeader eyebrow="Schedule" title="Calendar" description="Drag an appointment onto another day to reschedule it." actions={<button className="button primary" onClick={() => setAddingDate(format(cursor, 'yyyy-MM-dd'))}><Plus /> New appointment</button>} />
    <section className="calendar-panel"><div className="calendar-toolbar"><div className="calendar-nav"><button className="icon-button" onClick={() => move(-1)} aria-label="Previous period"><ChevronLeft /></button><button className="button secondary small-button" onClick={() => setCursor(new Date())}>Today</button><button className="icon-button" onClick={() => move(1)} aria-label="Next period"><ChevronRight /></button><h2>{view === 'Month' ? format(cursor, 'MMMM yyyy') : view === 'Week' ? `${format(weekStart, 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}` : format(cursor, 'EEEE, MMMM d, yyyy')}</h2></div><div className="segmented">{views.map((item) => <button className={view === item ? 'active' : ''} onClick={() => setView(item)} key={item}>{item}</button>)}</div></div>
      {view === 'Month' && <div className="month-calendar"><div className="weekday-row">{weekDays.map((day) => <span key={day}>{format(day, 'EEE')}</span>)}</div><div className="month-grid">{visibleDays.map((day) => { const key = format(day, 'yyyy-MM-dd'); return <div role="button" tabIndex="0" key={key} className={`calendar-day ${!isSameMonth(day, cursor) ? 'outside' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`} onClick={() => setAddingDate(key)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropOn(e, day)}><span className="day-number">{format(day, 'd')}</span><div className="day-items">{(itemsByDate[key] || []).slice(0, 3).map((item) => <CalendarItem key={item.id} item={item} onEdit={setEditing} />)}{(itemsByDate[key] || []).length > 3 && <small>+{itemsByDate[key].length - 3} more</small>}</div></div>; })}</div></div>}
      {view === 'Week' && <div className="week-calendar">{weekDays.map((day) => { const key = format(day, 'yyyy-MM-dd'); return <div key={key} className={isSameDay(day, new Date()) ? 'today' : ''} onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropOn(e, day)}><button className="week-heading" onClick={() => { setCursor(day); setView('Day'); }}><span>{format(day, 'EEE')}</span><strong>{format(day, 'd')}</strong></button><div className="week-items">{(itemsByDate[key] || []).map((item) => <CalendarItem key={item.id} item={item} onEdit={setEditing} />)}<button className="week-add" onClick={() => setAddingDate(key)}><Plus /> Add</button></div></div>; })}</div>}
      {view === 'Day' && <DayView date={cursor} items={itemsByDate[format(cursor, 'yyyy-MM-dd')] || []} onEdit={setEditing} onAdd={() => setAddingDate(format(cursor, 'yyyy-MM-dd'))} />}
      {view === 'Agenda' && <div className="agenda-view">{appointments.filter((item) => new Date(`${item.date}T${item.startTime}`) >= new Date()).slice(0, 30).map((item) => <div key={item.id}><time><strong>{format(parseISO(item.date), 'dd')}</strong><span>{format(parseISO(item.date), 'MMM')}</span></time><CalendarItem item={item} onEdit={setEditing} /></div>)}{!appointments.length && <EmptyState title="No agenda yet" description="Create your first appointment to start planning." />}</div>}
    </section>{editing && <AppointmentModal appointment={editing} onClose={() => setEditing(null)} />}{addingDate && <AppointmentModal initialDate={addingDate} onClose={() => setAddingDate(null)} />}</>;
}

function DayView({ date, items, onEdit, onAdd }) {
  return <div className="day-view"><div className="day-summary"><span className="eyebrow">{format(date, 'EEEE')}</span><strong>{format(date, 'dd')}</strong><p>{items.length} appointment{items.length === 1 ? '' : 's'}</p><button className="button secondary" onClick={onAdd}><Plus /> Add time</button></div><div className="day-timeline">{Array.from({ length: 13 }, (_, index) => index + 7).map((hour) => <div className="time-row" key={hour}><time>{format(new Date(2020, 1, 1, hour), 'h a')}</time><div>{items.filter((item) => Number(item.startTime.split(':')[0]) === hour).map((item) => <CalendarItem key={item.id} item={item} onEdit={onEdit} />)}</div></div>)}</div></div>;
}
