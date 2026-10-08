import { createContext, useContext, useState } from 'react';
import { api, clearSession, getStoredSession, storeSession } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession);

  const authenticate = async (mode, values) => {
    const next = await api(`/auth/${mode}`, { method: 'POST', body: values });
    storeSession(next);
    setSession(next);
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  return <AuthContext.Provider value={{ session, token: session?.token, user: session?.user, authenticate, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
