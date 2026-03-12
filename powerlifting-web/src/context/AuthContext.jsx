import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    sessionStorage.setItem('access_token', data.accessToken);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, role) => {
    const data = await api.register(email, password, role);
    sessionStorage.setItem('access_token', data.accessToken);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    sessionStorage.clear();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
