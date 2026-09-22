import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from './Navbar';

export function ProtectedRoute({ children, requireAdmin = false, requireSuperAdmin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Iniciando sesión segura…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location, sessionExpired: true }} replace />;
  }

  // El Superadmin es exclusivo de la gestión de Equipos y Empresas; no opera chats de canales
  if (user.role === 'superadmin' && !location.pathname.includes('teams')) {
    return <Navigate to="/teams" replace />;
  }

  if (requireSuperAdmin && user.role !== 'superadmin') {
    return <Navigate to="/inbox" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/inbox" replace />;
  }

  let currentRoute = 'inbox';
  if (location.pathname.includes('teams')) currentRoute = 'teams';
  else if (location.pathname.includes('settings')) currentRoute = 'settings';
  else if (location.pathname.includes('pedidos')) currentRoute = 'pedidos';
  else if (location.pathname.includes('productos')) currentRoute = 'productos';
  else if (location.pathname.includes('metricas')) currentRoute = 'metricas';

  return (
    <div className="admin-layout">
      <Navbar
        currentRoute={currentRoute}
        onNavigate={(route) => navigate(`/${route}`)}
      />
      {children}
    </div>
  );
}

export default ProtectedRoute;
