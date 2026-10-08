import { format, isSameDay, parseISO } from 'date-fns';

export const TYPES = [
  'Meeting', 'Important Meeting', 'Interview', 'Work', 'Project', 'Deployment', 'Personal',
  'Training', 'School', 'Travel', 'Payment', 'Reminder', 'Other',
];
export const STATUSES = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const REMINDERS = [
  { value: 0, label: 'At start time' },
  { value: 2, label: '2 minutes before' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export const emptyAppointment = (date = format(new Date(), 'yyyy-MM-dd')) => ({
  title: '', date, startTime: '09:00', endTime: '09:30', meetingWith: '', company: '',
  email: '', mobile: '', location: '', meetingUrl: '', type: 'Meeting', priority: 'medium',
  status: 'scheduled', description: '', agenda: '', notes: '', recurring: false, reminder: 2,
});

export function appointmentDate(item) {
  return new Date(`${item.date}T${item.startTime || '00:00'}:00`);
}

export function validateAppointment(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = 'Title is required';
  if (!values.date) errors.date = 'Date is required';
  if (!values.startTime) errors.startTime = 'Start time is required';
  if (!values.endTime) errors.endTime = 'End time is required';
  if (values.startTime && values.endTime && values.endTime <= values.startTime) errors.endTime = 'End time must be after start time';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address';
  if (values.meetingUrl && !/^https?:\/\//i.test(values.meetingUrl)) errors.meetingUrl = 'Use a full http(s) URL';
  return errors;
}

export function formatAppointmentTime(item) {
  return `${format(appointmentDate(item), 'h:mm a')} - ${format(new Date(`${item.date}T${item.endTime}:00`), 'h:mm a')}`;
}

export function isToday(item) {
  return isSameDay(parseISO(item.date), new Date());
}

export function matchesAppointment(item, query) {
  const haystack = [item.title, item.meetingWith, item.company, item.email, item.mobile, item.location, item.type, item.status, item.notes]
    .filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export const typeClassName = (type = 'Other') => `type-${type.toLowerCase().replace(/\s+/g, '-')}`;

export function appointmentDetails(item) {
  return [
    `Appointment: ${item.title}`,
    `Date: ${item.date}`,
    `Time: ${item.startTime} - ${item.endTime}`,
    item.meetingWith && `Meeting with: ${item.meetingWith}`,
    item.company && `Company: ${item.company}`,
    item.email && `Email: ${item.email}`,
    item.mobile && `Mobile: ${item.mobile}`,
    item.location && `Location: ${item.location}`,
    item.meetingUrl && `Meeting URL: ${item.meetingUrl}`,
    `Type: ${item.type || 'Other'}`,
    `Priority: ${item.priority || 'medium'}`,
    `Status: ${item.status || 'scheduled'}`,
    item.description && `Description: ${item.description}`,
    item.agenda && `Agenda: ${item.agenda}`,
    item.notes && `Notes: ${item.notes}`,
  ].filter(Boolean).join('\n');
}
