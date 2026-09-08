import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tarot_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('tarot_token'));
  const [loading, setLoading] = useState(true);

  // Helper de peticiones autenticadas hacia el proxy local de Vite (/api)
  const apiFetch = async (url, options = {}) => {
    const currentToken = localStorage.getItem('tarot_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
      ...(options.headers || {})
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  // Verificar la sesión con el backend al iniciar
  const checkAuth = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('tarot_user', JSON.stringify(data.user));
      } else {
        // Sesión inválida o expirada
        setUser(null);
        localStorage.removeItem('tarot_user');
        localStorage.removeItem('tarot_token');
      }
    } catch (err) {
      console.warn('Servidor no disponible al verificar sesión:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Credenciales inválidas. Verifica correo o contraseña.');
    }

    setUser(data.user);
    if (data.token) {
      setToken(data.token);
      localStorage.setItem('tarot_token', data.token);
    }
    localStorage.setItem('tarot_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Error en logout del servidor:', e);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('tarot_user');
    localStorage.removeItem('tarot_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiFetch, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};
