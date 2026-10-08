import { CalendarDays, Check, Clock3, Copy, Edit3, ExternalLink, Mail, MapPin, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { appointmentDetails, formatAppointmentTime, formatDisplayDate, typeClassName } from '../lib/appointment';

export default function AppointmentCard({ appointment, onEdit, onDelete, onComplete, compact = false }) {
  const [open, setOpen] = useState(false);
  const details = appointmentDetails(appointment);
  const copy = async () => navigator.clipboard.writeText(details);
  const whatsapp = `https://wa.me/${appointment.mobile?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(details)}`;
  return <article className={`appointment-card ${compact ? 'compact' : ''}`}>
    <div className={`type-bar ${typeClassName(appointment.type)}`} />
    <div className="appointment-date"><strong>{format(parseISO(appointment.date), 'dd')}</strong><span>{format(parseISO(appointment.date), 'MMM')}</span></div>
    <div className="appointment-body"><div className="appointment-title-row"><div><span className={`status-pill status-${appointment.status}`}>{appointment.status}</span><h3>{appointment.title}</h3></div><div className="more-wrap"><button className="icon-button small" aria-label="Appointment actions" onClick={() => setOpen(!open)}><MoreHorizontal /></button>{open && <div className="action-menu">
      <button onClick={() => { onEdit(appointment); setOpen(false); }}><Edit3 /> Edit</button>
      {onComplete && appointment.status !== 'completed' && <button onClick={() => onComplete(appointment)}><Check /> Complete</button>}
      <button onClick={copy}><Copy /> Copy details</button>
      <button className="danger-text" onClick={() => onDelete(appointment)}><Trash2 /> Delete</button>
    </div>}</div></div>
      <div className="appointment-meta"><span><CalendarDays />{formatDisplayDate(appointment.date)}</span><span><Clock3 />{formatAppointmentTime(appointment)}</span>{appointment.meetingWith && <span>with {appointment.meetingWith}{appointment.company && `, ${appointment.company}`}</span>}{appointment.location && <span><MapPin />{appointment.location}</span>}</div>
      <div className="appointment-quick-actions">
        <a className="text-button" href={`mailto:${appointment.email || ''}?subject=${encodeURIComponent(appointment.title)}&body=${encodeURIComponent(details)}`}><Mail /> Send Email</a>
        <a className="text-button" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
        {appointment.meetingUrl && <a className="text-button" href={appointment.meetingUrl} target="_blank" rel="noreferrer"><ExternalLink /> Join</a>}
        <button className="text-button" onClick={copy}><Copy /> Copy Details</button>
      </div>
    </div>
  </article>;
}
