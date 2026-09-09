import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { BrandMark } from './BrandMark';
import { IconoMensajes, IconoAjustes, IconoDeCanal } from './Icons';

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
              <h1>Bandeja</h1>
              {/* Los tres logos dicen de dónde llegan los mensajes mejor que
                  una línea de texto en mayúsculas. */}
              <span className="brand-channels" title="WhatsApp, Messenger e Instagram">
                <IconoDeCanal platform="whatsapp" size={13} />
                <IconoDeCanal platform="messenger" size={13} />
                <IconoDeCanal platform="instagram" size={13} />
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
            <IconoMensajes size={17} />
            <span>Mensajes</span>
          </button>

          {user.role === 'admin' && (
            <button
              type="button"
              className={`btn-nav-inbox ${currentRoute === 'settings' ? 'active' : ''}`}
              onClick={() => onNavigate('settings')}
            >
              <IconoAjustes size={17} />
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
