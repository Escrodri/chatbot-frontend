import React from 'react';
import { Link } from 'react-router-dom';

export function PublicHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo-brand" style={{ textDecoration: 'none' }}>
          <div className="logo-icon">🔮</div>
          <div className="logo-text">
            <span className="logo-title">Lecturas de Tarot</span>
            <span className="logo-sub">lecturasdetarte.online</span>
          </div>
        </Link>

        <nav>
          <ul className="site-nav">
            <li className="nav-item"><Link to="/">Inicio</Link></li>
            <li className="nav-item"><a href="/#servicios">Tiradas & Consultas</a></li>
            <li className="nav-item"><a href="/#canales">Canales de Atención</a></li>
            <li className="nav-item"><Link to="/politica-de-privacidad">Privacidad</Link></li>
            <li className="nav-item"><Link to="/terminos-de-servicio">Términos</Link></li>
            <li className="nav-item"><Link to="/eliminacion-de-datos">Eliminación de Datos</Link></li>
          </ul>
        </nav>

        <div className="header-actions">
          <Link to="/login" className="btn btn-outline-gold" id="btn-login-header">
            <span>Portal Tarotistas</span>
            <span>🗝️</span>
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
              <div className="logo-icon" style={{ width: '32px', height: '32px', fontSize: '16px' }}>🔮</div>
              <div className="logo-title" style={{ fontSize: '17px' }}>Lecturas de Tarot Online</div>
            </div>
            <p>
              Servicio profesional de orientación espiritual y lecturas de cartas del tarot
              a través de plataformas oficiales de mensajería de Meta (WhatsApp, Messenger, Instagram).
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h5>Navegación</h5>
              <ul>
                <li><Link to="/">Inicio</Link></li>
                <li><a href="/#servicios">Tiradas Disponibles</a></li>
                <li><a href="/#canales">Canales de Contacto</a></li>
                <li><Link to="/login">Acceso para Tarotistas</Link></li>
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
          <div>© 2026 lecturasdetarte.online. Todos los derechos reservados.</div>
          <div className="backend-indicator" id="footer-status-indicator">
            <span className="pulse"></span>
            <span>Servidores en línea • Atención activa</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
