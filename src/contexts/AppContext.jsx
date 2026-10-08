import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { appointmentDate } from '../lib/appointment';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);
const DEFAULT_SETTINGS = { theme: 'light', accent: 'teal', compact: false, notifications: true, sound: true, defaultReminder: 2, weekStartsMonday: true };

export function AppProvider({ children }) {
  const { token, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const notified = useRef(new Set());

  const toast = (message, tone = 'success') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4000);
  };

  useEffect(() => {
    let active = true;
    Promise.all([api('/appointments', { token }), api('/settings', { token })])
      .then(([items, saved]) => {
        if (!active) return;
        setAppointments(items);
        setSettings({ ...DEFAULT_SETTINGS, ...saved });
      })
      .catch((error) => {
        if (error.status === 401) logout();
        else toast(error.message, 'error');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.accent = settings.accent;
    document.documentElement.dataset.compact = String(settings.compact);
  }, [settings]);

  useEffect(() => {
    const check = () => {
      if (!settings.notifications) return;
      const now = Date.now();
      appointments.forEach((item) => {
        if (['completed', 'cancelled'].includes(item.status) || item.reminder === false) return;
        const minutes = Number(item.reminder ?? settings.defaultReminder ?? 2);
        const due = appointmentDate(item).getTime() - minutes * 60000;
        if (now >= due && now <= appointmentDate(item).getTime() + 60000 && !notified.current.has(item.id)) {
          notified.current.add(item.id);
          toast(`${item.title} starts at ${item.startTime}`, 'info');
          if ('Notification' in window && Notification.permission === 'granted') new Notification(item.title, { body: `Starts at ${item.startTime}${item.location ? ` at ${item.location}` : ''}` });
          if (settings.sound) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
              const audio = new AudioContextClass();
              const oscillator = audio.createOscillator();
              oscillator.connect(audio.destination); oscillator.frequency.value = 660; oscillator.start(); oscillator.stop(audio.currentTime + 0.18);
            }
          }
        }
      });
    };
    check();
    const interval = window.setInterval(check, 30000);
    return () => window.clearInterval(interval);
  }, [appointments, settings]);

  const createAppointment = async (values) => {
    const created = await api('/appointments', { token, method: 'POST', body: values });
    setAppointments((current) => [...current, created].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)));
    toast('Appointment created');
    return created;
  };

  const updateAppointment = async (id, values, message = 'Appointment updated') => {
    const updated = await api(`/appointments/${id}`, { token, method: 'PUT', body: values });
    setAppointments((current) => current.map((item) => item.id === id ? updated : item).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)));
    toast(message);
    return updated;
  };

  const deleteAppointment = async (id) => {
    await api(`/appointments/${id}`, { token, method: 'DELETE' });
    setAppointments((current) => current.filter((item) => item.id !== id));
    toast('Appointment deleted');
  };

  const saveSettings = async (next) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    try {
      const saved = await api('/settings', { token, method: 'PUT', body: merged });
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
      toast('Settings saved');
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  return <AppContext.Provider value={{ appointments, settings, loading, toasts, toast, createAppointment, updateAppointment, deleteAppointment, saveSettings }}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
