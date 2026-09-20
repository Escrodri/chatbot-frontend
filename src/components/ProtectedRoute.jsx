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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSuperAdmin && user.role !== 'superadmin') {
    return <Navigate to="/inbox" replace />;
  }

  if (requireAdmin && user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/inbox" replace />;
  }

  let currentRoute = 'inbox';
  if (location.pathname.includes('teams')) currentRoute = 'teams';
  else if (location.pathname.includes('settings')) currentRoute = 'settings';

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
