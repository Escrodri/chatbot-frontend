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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-cosmos)',
          color: 'var(--gold-primary)'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔮</div>
        <p style={{ fontFamily: 'var(--font-serif)', letterSpacing: '1px' }}>Iniciando sesión segura...</p>
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
