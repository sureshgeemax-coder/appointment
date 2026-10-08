import { useState } from 'react';
import { Bell, Check, MonitorCog, Palette, Save, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { REMINDERS } from '../lib/appointment';
import { formatDisplayDate } from '../lib/appointment';
import { PageHeader } from '../components/UI';

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, saveSettings } = useApp();
  const [form, setForm] = useState(settings);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <><PageHeader eyebrow="Preferences" title="Settings" description="Make your workspace feel and work the way you do." />
    <form className="settings-layout" onSubmit={(e) => { e.preventDefault(); saveSettings(form); }}>
      <aside className="settings-profile"><span>{user.name.slice(0, 1).toUpperCase()}</span><h3>{user.name}</h3><p>{user.email}</p><small>Member since {formatDisplayDate(new Date(user.createdAt))}</small></aside>
      <div className="settings-panels"><section className="panel settings-section"><div className="settings-title"><Palette /><div><h2>Appearance</h2><p>Choose a comfortable visual style.</p></div></div><div className="theme-choices"><button type="button" className={form.theme === 'light' ? 'active' : ''} onClick={() => set('theme', 'light')}><span className="theme-preview light-preview" />Light {form.theme === 'light' && <Check />}</button><button type="button" className={form.theme === 'dark' ? 'active' : ''} onClick={() => set('theme', 'dark')}><span className="theme-preview dark-preview" />Dark {form.theme === 'dark' && <Check />}</button><button type="button" className={form.theme === 'system' ? 'active' : ''} onClick={() => set('theme', 'system')}><span className="theme-preview system-preview" />System {form.theme === 'system' && <Check />}</button></div><div className="setting-row"><div><strong>Accent color</strong><p>Used for buttons and highlights.</p></div><div className="accent-choices">{['teal', 'indigo', 'rose', 'amber'].map((color) => <button aria-label={`${color} accent`} type="button" className={`${color} ${form.accent === color ? 'active' : ''}`} onClick={() => set('accent', color)} key={color} />)}</div></div><div className="setting-row"><div><strong>Compact layout</strong><p>Fit more information on screen.</p></div><label className="switch"><input type="checkbox" checked={form.compact} onChange={(e) => set('compact', e.target.checked)} /><span /></label></div></section>
        <section className="panel settings-section"><div className="settings-title"><Bell /><div><h2>Reminders</h2><p>Control how appointments get your attention.</p></div></div><div className="setting-row"><div><strong>Default reminder</strong><p>Applied to new appointments.</p></div><select value={form.defaultReminder} onChange={(e) => set('defaultReminder', Number(e.target.value))}>{REMINDERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div className="setting-row"><div><strong>Browser notifications</strong><p>Show an alert even when the tab is in the background.</p></div><label className="switch"><input type="checkbox" checked={form.notifications} onChange={(e) => set('notifications', e.target.checked)} /><span /></label></div><div className="setting-row"><div><strong>Notification sound</strong><p>Play a gentle tone with reminders.</p></div><label className="switch"><input type="checkbox" checked={form.sound} onChange={(e) => set('sound', e.target.checked)} /><span /></label></div></section>
        <section className="panel settings-section"><div className="settings-title"><SlidersHorizontal /><div><h2>Calendar behavior</h2><p>Set your preferred schedule conventions.</p></div></div><div className="setting-row"><div><strong>Week starts on Monday</strong><p>Otherwise calendar weeks begin on Sunday.</p></div><label className="switch"><input type="checkbox" checked={form.weekStartsMonday} onChange={(e) => set('weekStartsMonday', e.target.checked)} /><span /></label></div><div className="setting-row"><div><strong>Time format</strong><p>Choose how appointment times appear.</p></div><select value={form.timeFormat || '12'} onChange={(e) => set('timeFormat', e.target.value)}><option value="12">12-hour</option><option value="24">24-hour</option></select></div></section>
        <button className="button primary settings-save"><Save /> Save preferences</button>
      </div>
    </form>
  </>;
}
