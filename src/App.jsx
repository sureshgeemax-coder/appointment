import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import Shell from './components/Shell';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import Appointments from './pages/Appointments';
import ReportsPage from './pages/ReportsPage';
import RemindersPage from './pages/RemindersPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';

function ProtectedApp() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <AppProvider><Shell /></AppProvider>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<AuthPage />} />
    <Route element={<ProtectedApp />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/add" element={<Dashboard />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/reminders" element={<RemindersPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/help" element={<HelpPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
}
