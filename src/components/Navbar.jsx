import React from 'react';
import { useAuth } from '../context/AuthContext';

export function Navbar({ currentRoute, onNavigate }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="admin-navbar">
      <div className="admin-nav-inner">
        <div className="brand-section">
          <a
            href="/"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div className="brand-logo-small">🔮</div>
            <div className="brand-title-group">
              <h1>Lecturas de Tarot</h1>
              <span className="admin-badge">
                {user.role === 'admin' ? 'ADMINISTRACIÓN OMNICANAL' : 'PANEL DE TAROTISTAS'}
              </span>
            </div>
          </a>
        </div>

        <div className="nav-actions">
          {/* Enlace a Bandeja de Entrada */}
          <button
            type="button"
            className={`btn-nav-inbox ${currentRoute === 'inbox' ? 'active' : ''}`}
            onClick={() => onNavigate('inbox')}
            style={{ cursor: 'pointer' }}
          >
            <span>💬</span>
            <span>Bandeja de Mensajes</span>
          </button>

          {/* Enlace a Configuración (solo para Admin) */}
          {user.role === 'admin' && (
            <button
              type="button"
              className={`btn-nav-inbox ${currentRoute === 'settings' ? 'active' : ''}`}
              onClick={() => onNavigate('settings')}
              style={{
                cursor: 'pointer',
                background: currentRoute === 'settings' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.08)',
                borderColor: 'var(--border-gold)',
                color: 'var(--gold-light)'
              }}
            >
              <span>⚙️</span>
              <span>Configuración</span>
            </button>
          )}

          {/* Datos del Operador */}
          <div className="user-pill">
            <div className="user-avatar-small">
              {(user.name || user.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span style={{ fontWeight: 600, display: 'block', lineHeight: 1.1 }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user.email}
              </span>
            </div>
          </div>

          <button
            className="btn-logout"
            onClick={logout}
            title="Cerrar Sesión"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
