import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { BrandMark } from './BrandMark';

export function Navbar({ currentRoute, onNavigate }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="admin-navbar">
      <div className="admin-nav-inner">
        <div className="brand-section">
          <a
            href="/"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit' }}
          >
            <div className="brand-logo-small"><BrandMark /></div>
            <div className="brand-title-group">
              <h1>Bandeja Unificada</h1>
              <span className="admin-badge">
                {user.role === 'admin' ? 'Administración' : 'Operador'} · WhatsApp · Messenger · Instagram
              </span>
            </div>
          </a>
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className={`btn-nav-inbox ${currentRoute === 'inbox' ? 'active' : ''}`}
            onClick={() => onNavigate('inbox')}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5c-5.2 0-9.4 3.7-9.4 8.3 0 2.5 1.2 4.8 3.2 6.3v3.1c0 .5.5.8 1 .5l2.9-1.9c.7.1 1.5.2 2.3.2 5.2 0 9.4-3.7 9.4-8.3S17.2 2.5 12 2.5z" />
            </svg>
            <span>Mensajes</span>
          </button>

          {user.role === 'admin' && (
            <button
              type="button"
              className={`btn-nav-inbox ${currentRoute === 'settings' ? 'active' : ''}`}
              onClick={() => onNavigate('settings')}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
              </svg>
              <span>Configuración</span>
            </button>
          )}

          <ThemeToggle variant="header" />

          <div className="user-pill">
            <div className="user-avatar-small">
              {(user.name || user.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span style={{ fontWeight: 600, display: 'block' }}>{user.name}</span>
              <span style={{ fontSize: '11.5px', display: 'block' }}>{user.email}</span>
            </div>
          </div>

          <button className="btn-logout" onClick={logout} title="Cerrar sesión">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
