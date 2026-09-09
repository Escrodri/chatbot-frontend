import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { BrandMark } from './BrandMark';

export const BRAND_NAME = 'Bandeja Unificada';
export const BRAND_DOMAIN = 'lecturasdetarde.online';

export function PublicHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo-brand">
          <div className="logo-icon"><BrandMark size={21} /></div>
          <div className="logo-text">
            <span className="logo-title">{BRAND_NAME}</span>
            <span className="logo-sub">{BRAND_DOMAIN}</span>
          </div>
        </Link>

        <nav>
          <ul className="site-nav">
            <li className="nav-item"><Link to="/">Inicio</Link></li>
            <li className="nav-item"><a href="/#servicios">Cómo funciona</a></li>
            <li className="nav-item"><a href="/#canales">Canales</a></li>
            <li className="nav-item"><Link to="/politica-de-privacidad">Privacidad</Link></li>
            <li className="nav-item"><Link to="/terminos-de-servicio">Términos</Link></li>
            <li className="nav-item"><Link to="/eliminacion-de-datos">Eliminar datos</Link></li>
          </ul>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <Link to="/login" className="btn btn-gold" id="btn-login-header">
            <span>Entrar</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand-info">
            <div className="logo-brand">
              <div className="logo-icon" style={{ width: '32px', height: '32px' }}>
                <BrandMark size={17} />
              </div>
              <div className="logo-title" style={{ fontSize: '16px' }}>{BRAND_NAME}</div>
            </div>
            <p>
              Atención al cliente en un solo lugar. Recibimos y respondemos los mensajes de
              WhatsApp, Facebook Messenger e Instagram Direct desde una bandeja compartida,
              usando exclusivamente las APIs oficiales de Meta.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h5>Navegación</h5>
              <ul>
                <li><Link to="/">Inicio</Link></li>
                <li><a href="/#servicios">Cómo funciona</a></li>
                <li><a href="/#canales">Canales de contacto</a></li>
                <li><Link to="/login">Acceso del equipo</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Políticas & Cumplimiento</h5>
              <ul>
                <li><Link to="/politica-de-privacidad">Política de Privacidad</Link></li>
                <li><Link to="/terminos-de-servicio">Términos de Servicio</Link></li>
                <li><Link to="/eliminacion-de-datos">Eliminación de Datos</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 {BRAND_DOMAIN}. Todos los derechos reservados.</div>
          <div className="backend-indicator" id="footer-status-indicator">
            <span className="pulse"></span>
            <span>Atención activa</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
