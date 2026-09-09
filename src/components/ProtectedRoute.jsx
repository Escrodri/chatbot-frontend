import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from './Navbar';

export function ProtectedRoute({ children, requireAdmin = false }) {
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

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/inbox" replace />;
  }

  const currentRoute = location.pathname.includes('settings') ? 'settings' : 'inbox';

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
