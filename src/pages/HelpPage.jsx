import { BookOpen, CalendarPlus, FileBarChart, Keyboard, LifeBuoy, Mail, MessageCircleQuestion, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/UI';

const guides = [
  [CalendarPlus, 'Create and manage appointments', 'Add attendees, meeting links, recurrence and reminders.', '/add'],
  [BookOpen, 'Use calendar views', 'Move between month, week, day and agenda views. Drag events to reschedule.', '/calendar'],
  [FileBarChart, 'Build and export reports', 'Filter activity and export to CSV, Excel or PDF.', '/reports'],
  [Search, 'Find anything quickly', 'Search across names, notes, companies and locations.', '/search'],
];

export default function HelpPage() {
  return <><PageHeader eyebrow="Support" title="How can we help?" description="Shortcuts, guides and answers for a smoother day." />
    <section className="help-banner"><div><LifeBuoy /><span>Built for clarity</span><h2>Everything is one or two clicks away.</h2><p>Start with a guide, or use the keyboard tips below to move faster.</p></div><a className="button white" href="mailto:support@example.com"><Mail /> Contact support</a></section>
    <section className="guide-grid">{guides.map(([Icon, title, description, to]) => <Link to={to} key={title}><span><Icon /></span><h3>{title}</h3><p>{description}</p><strong>Open guide →</strong></Link>)}</section>
    <div className="help-columns"><section className="panel"><div className="settings-title"><MessageCircleQuestion /><div><h2>Common questions</h2><p>Quick answers about your data and schedule.</p></div></div><details><summary>Where is my appointment data stored?</summary><p>Your data is sent securely to this app’s API and stored against your authenticated account.</p></details><details><summary>How do I reschedule quickly?</summary><p>Open Calendar and drag an appointment to another date, or edit its date and time directly.</p></details><details><summary>Why am I not seeing browser alerts?</summary><p>Enable browser alerts in Reminder Center and allow notification permission when your browser asks.</p></details><details><summary>Can I take my data elsewhere?</summary><p>Yes. Reports supports CSV, Excel and PDF exports for any selected time period and appointment type.</p></details></section>
      <section className="panel"><div className="settings-title"><Keyboard /><div><h2>Useful shortcuts</h2><p>Browser-native actions that save time.</p></div></div><div className="shortcut-list"><div><span>Move between controls</span><kbd>Tab</kbd></div><div><span>Activate a focused button</span><kbd>Enter</kbd></div><div><span>Close most dialogs</span><kbd>Esc</kbd></div><div><span>Find text on this page</span><kbd>Ctrl F</kbd></div></div></section></div>
  </>;
}
