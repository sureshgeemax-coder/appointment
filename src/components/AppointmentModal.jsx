import { useEffect, useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { emptyAppointment, PRIORITIES, REMINDERS, STATUSES, TYPES, validateAppointment } from '../lib/appointment';
import { Modal } from './UI';

const Field = ({ label, error, required, children, className = '' }) => <label className={`field ${className}`}><span>{label}{required && <b aria-hidden="true"> *</b>}</span>{children}{error && <small className="field-error">{error}</small>}</label>;

export default function AppointmentModal({ appointment, initialDate, onClose }) {
  const { createAppointment, updateAppointment, settings, toast } = useApp();
  const [values, setValues] = useState(() => appointment ? { ...emptyAppointment(), ...appointment } : { ...emptyAppointment(initialDate), reminder: settings.defaultReminder ?? 2 });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    const first = document.querySelector('.modal input');
    first?.focus();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateAppointment(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    const { id, userId, createdAt, updatedAt, ...payload } = values;
    payload.reminder = payload.reminder === false ? false : Number(payload.reminder);
    payload.recurring = payload.recurring ? { frequency: payload.recurring.frequency || payload.recurring || 'weekly' } : false;
    try {
      if (appointment) await updateAppointment(appointment.id, payload);
      else await createAppointment(payload);
      onClose();
    } catch (error) {
      toast(error.details?.join('. ') || error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={appointment ? 'Edit appointment' : 'New appointment'} description="Add the details your day needs. Required fields are marked." onClose={onClose} wide>
    <form className="appointment-form" onSubmit={submit} noValidate>
      <div className="form-section"><h3><CalendarClock size={18} /> Schedule</h3><div className="form-grid">
        <Field label="Appointment title" error={errors.title} required className="span-2"><input value={values.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Product strategy review" /></Field>
        <Field label="Date (DD/MMM/YYYY)" error={errors.date} required><input type="date" value={values.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <div className="field-pair"><Field label="Starts" error={errors.startTime} required><input type="time" value={values.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field><Field label="Ends" error={errors.endTime} required><input type="time" value={values.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field></div>
        <Field label="Type"><select value={values.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
        <div className="field-pair"><Field label="Priority"><select value={values.priority} onChange={(e) => set('priority', e.target.value)}>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Status"><select value={values.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></Field></div>
      </div></div>
      <div className="form-section"><h3>Attendee & place</h3><div className="form-grid">
        <Field label="Meeting with"><input value={values.meetingWith} onChange={(e) => set('meetingWith', e.target.value)} placeholder="Full name" /></Field>
        <Field label="Company"><input value={values.company} onChange={(e) => set('company', e.target.value)} placeholder="Organization" /></Field>
        <Field label="Email" error={errors.email}><input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} placeholder="name@company.com" /></Field>
        <Field label="Mobile"><input type="tel" value={values.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+91 98765 43210" /></Field>
        <Field label="Location"><input value={values.location} onChange={(e) => set('location', e.target.value)} placeholder="Room, building or address" /></Field>
        <Field label="Meeting URL" error={errors.meetingUrl}><input type="url" value={values.meetingUrl} onChange={(e) => set('meetingUrl', e.target.value)} placeholder="https://meet.example.com/..." /></Field>
      </div></div>
      <div className="form-section"><h3>Preparation</h3><div className="form-grid">
        <Field label="Description" className="span-2"><textarea rows="2" value={values.description} onChange={(e) => set('description', e.target.value)} placeholder="A short summary" /></Field>
        <Field label="Agenda"><textarea rows="3" value={values.agenda} onChange={(e) => set('agenda', e.target.value)} placeholder="Discussion points" /></Field>
        <Field label="Private notes"><textarea rows="3" value={values.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Context and follow-ups" /></Field>
        <Field label="Reminder"><select value={values.reminder === false ? 'off' : values.reminder} onChange={(e) => set('reminder', e.target.value === 'off' ? false : Number(e.target.value))}><option value="off">No reminder</option>{REMINDERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Repeat"><select value={values.recurring ? values.recurring.frequency || values.recurring : 'none'} onChange={(e) => set('recurring', e.target.value === 'none' ? false : { frequency: e.target.value })}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></Field>
      </div></div>
      <div className="modal-actions sticky"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}><Save size={17} />{saving ? 'Saving...' : appointment ? 'Save changes' : 'Create appointment'}</button></div>
    </form>
  </Modal>;
}
