import { useState } from 'react';
import { Bell, BellRing, Check, Clock3, Volume2 } from 'lucide-react';
import { differenceInMinutes, format, isAfter } from 'date-fns';
import { useApp } from '../contexts/AppContext';
import { appointmentDate, formatDisplayDate } from '../lib/appointment';
import AppointmentCard from '../components/AppointmentCard';
import { EmptyState, PageHeader } from '../components/UI';

export default function RemindersPage() {
  const { appointments, settings, saveSettings, updateAppointment, toast } = useApp();
  const [snoozed, setSnoozed] = useState({});
  const upcoming = appointments.filter((item) => isAfter(appointmentDate(item), new Date()) && !['completed', 'cancelled'].includes(item.status) && item.reminder !== false).slice(0, 20);
  const enableNotifications = async () => {
    if (!('Notification' in window)) return toast('Browser notifications are not supported here.', 'error');
    const permission = await Notification.requestPermission();
    if (permission === 'granted') { await saveSettings({ notifications: true }); toast('Browser notifications enabled'); }
    else toast('Notification permission was not granted.', 'error');
  };
  const snooze = (item, minutes) => {
    setSnoozed((current) => ({ ...current, [item.id]: Date.now() + minutes * 60000 }));
    toast(`Reminder snoozed for ${minutes} minutes`, 'info');
  };
  return <><PageHeader eyebrow="Stay ahead" title="Reminder center" description="Timely nudges for the commitments that matter." actions={<button className="button secondary" onClick={enableNotifications}><BellRing /> Enable browser alerts</button>} />
    <section className="reminder-settings"><div><span className="reminder-icon"><Bell /></span><div><strong>Appointment notifications</strong><p>Default reminder is {settings.defaultReminder ?? 2} minutes before each appointment.</p></div></div><label className="switch"><input type="checkbox" checked={settings.notifications} onChange={(e) => saveSettings({ notifications: e.target.checked })} /><span /></label><div><span className="reminder-icon"><Volume2 /></span><div><strong>Reminder sound</strong><p>Play a short sound when an alert is due.</p></div></div><label className="switch"><input type="checkbox" checked={settings.sound} onChange={(e) => saveSettings({ sound: e.target.checked })} /><span /></label></section>
    <div className="reminder-heading"><div><span className="eyebrow">Upcoming</span><h2>Next reminders</h2></div><span>{upcoming.length} active</span></div>
    {upcoming.length ? <div className="reminder-list">{upcoming.map((item) => { const minutes = Number(item.reminder ?? settings.defaultReminder ?? 2); const reminderTime = new Date(appointmentDate(item).getTime() - minutes * 60000); return <section key={item.id} className="reminder-card"><div className="reminder-when"><Clock3 /><strong>{formatDisplayDate(item.date)}</strong><span>{format(appointmentDate(item), 'h:mm a')}</span></div><div className="reminder-detail"><span className={`status-pill status-${item.status}`}>alerts {minutes} min before</span><h3>{item.title}</h3><p>{item.meetingWith ? `With ${item.meetingWith}` : item.location || 'Appointment reminder'} · Notification at {format(reminderTime, 'h:mm a')}</p>{snoozed[item.id] && <small>Snoozed until {format(snoozed[item.id], 'h:mm a')}</small>}</div><div className="reminder-actions"><select aria-label={`Snooze ${item.title}`} defaultValue="5" onChange={(e) => snooze(item, Number(e.target.value))}><option value="5">Snooze 5 min</option><option value="10">Snooze 10 min</option><option value="15">Snooze 15 min</option><option value="30">Snooze 30 min</option></select><button className="button secondary" onClick={() => snooze(item, 5)}><Clock3 /> Snooze</button><button className="button primary" onClick={() => updateAppointment(item.id, { status: 'completed' }, 'Appointment completed')}><Check /> Complete</button></div></section>; })}</div> : <EmptyState icon={Bell} title="All caught up" description="There are no active reminders. New appointments use a 2 minute reminder by default." />}
  </>;
}
