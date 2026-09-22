import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

const AuthContext = createContext(null);

const STORAGE_KEYS = ['ldt_user', 'ldt_token', 'tarot_user', 'tarot_token'];

function clearAllStorageKeys() {
  STORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ldt_user') || localStorage.getItem('tarot_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('ldt_token') || localStorage.getItem('tarot_token'));
  const [loading, setLoading] = useState(true);

  const clearLocalSession = () => {
    setUser(null);
    setToken(null);
    clearAllStorageKeys();
  };

  // Helper de peticiones autenticadas hacia la API
  const apiFetch = async (url, options = {}) => {
    const currentToken = localStorage.getItem('ldt_token') || localStorage.getItem('tarot_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(apiUrl(url), {
      ...options,
      headers,
      credentials: 'include'
    });

    // Si el backend rechaza la petición con 401 (Sesión inválida o expirada) y no estamos en login,
    // limpiamos de raíz la sesión local para evitar estados zombie donde parece abierta pero no funciona.
    if (res.status === 401 && !url.includes('/api/auth/login')) {
      clearLocalSession();
    }

    return res;
  };

  // Verificar la sesión con el backend al iniciar
  const checkAuth = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        try {
          localStorage.setItem('ldt_user', JSON.stringify(data.user));
          localStorage.setItem('tarot_user', JSON.stringify(data.user));
        } catch {}
      } else {
        // Sesión inválida o expirada en el servidor
        clearLocalSession();
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
    const res = await fetch(apiUrl('/api/auth/login'), {
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
      try {
        localStorage.setItem('ldt_token', data.token);
        localStorage.setItem('tarot_token', data.token);
      } catch {}
    }
    try {
      localStorage.setItem('ldt_user', JSON.stringify(data.user));
      localStorage.setItem('tarot_user', JSON.stringify(data.user));
    } catch {}
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Error en logout del servidor:', e);
    }
    clearLocalSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiFetch, checkAuth, clearLocalSession }}>
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
