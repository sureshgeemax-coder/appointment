import { useState } from 'react';
import { CalendarCheck2, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Phone, Sparkles, UserRound } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import sureshPhoto from '../../image/sureshkumar.jpg';

export default function AuthPage() {
  const { session, authenticate } = useAuth();
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState({ name: '', mobile: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (session) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (mode === 'signup' && values.name.trim().length < 2) return setError('Please enter your full name.');
    if (!values.email.includes('@')) return setError('Please enter a valid email address.');
    if (values.password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await authenticate(mode, mode === 'signup' ? values : { email: values.email, password: values.password });
    } catch (nextError) {
      setError(nextError.details?.join('. ') || nextError.message);
    } finally { setLoading(false); }
  };

  return <main className="auth-page">
    <section className="auth-showcase"><div className="auth-brand"><span className="photo-logo"><img src={sureshPhoto} alt="Suresh Kumar" /><i><CalendarCheck2 /></i></span><strong>Suresh Appointment App</strong></div><div className="auth-message"><span className="eyebrow light"><Sparkles /> Your time, beautifully organized</span><h1>Turn a full calendar into a <em>clear day.</em></h1><p>A calm, powerful workspace for appointments, follow-ups, reminders and the people who matter.</p><ul><li><Check /> See every commitment in one view</li><li><Check /> Stay ahead with intelligent reminders</li><li><Check /> Export meaningful reports in seconds</li></ul></div><div className="auth-quote"><p>“Make time visible, then make it count.”</p><span>Suresh Appointment App</span></div></section>
    <section className="auth-panel"><div className="auth-card"><div className="auth-mobile-brand"><span className="photo-logo"><img src={sureshPhoto} alt="Suresh Kumar" /><i><CalendarCheck2 /></i></span><strong>Suresh Appointment App</strong></div><span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start organizing'}</span><h2>{mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}</h2><p>{mode === 'login' ? 'Your schedule is waiting for you.' : 'Everything you need to own your day.'}</p>
      <div className="auth-tabs" role="tablist"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Log in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button></div>
      <form onSubmit={submit} noValidate>
        {mode === 'signup' && <label className="auth-field"><span>Full name</span><div><UserRound /><input autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="Suresh Kumar" /></div></label>}
        {mode === 'signup' && <label className="auth-field"><span>Mobile number <small>(optional)</small></span><div><Phone /><input type="tel" autoComplete="tel" value={values.mobile} onChange={(e) => setValues({ ...values, mobile: e.target.value })} placeholder="+65 9xxx xxxx" /></div></label>}
        <label className="auth-field"><span>Email address</span><div><Mail /><input type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} placeholder="you@company.com" /></div></label>
        <label className="auth-field"><span>Password</span><div><LockKeyhole /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="button primary auth-submit" disabled={loading}>{loading && <LoaderCircle className="spin" />}{loading ? 'Please wait...' : mode === 'login' ? 'Enter workspace' : 'Create my workspace'}</button>
      </form><small className="auth-terms">By continuing, you agree to keep your schedule respectful and secure.</small>
    </div></section>
  </main>;
}
