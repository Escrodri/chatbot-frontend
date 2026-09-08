import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';

export function LandingPage() {
  return (
    <>
      <PublicHeader />

      <main>
        {/* Hero Section */}
        <section className="hero-tarot">
          <div className="container">
            <div className="hero-tag">
              <span>✨ Consultas Espirituales en Tiempo Real</span>
            </div>

            <h1 className="hero-heading">
              Descubre lo que los Arcanos Revelan Sobre tu <span>Amor, Destino y Prosperidad</span>
            </h1>

            <p className="hero-subheading">
              Respuestas claras, certeras y confidenciales. Conéctate al instante con nuestras tarotistas profesionales
              a través de tu canal favorito: WhatsApp, Messenger o Instagram.
            </p>

            <div className="hero-ctas">
              <a href="#canales" className="btn btn-gold">
                <span>Iniciar Consulta Ahora</span>
                <span>➤</span>
              </a>
              <a href="#servicios" className="btn btn-outline-gold">
                <span>Ver Tipos de Lecturas</span>
              </a>
            </div>

            {/* Canales de Atención Directa */}
            <div className="contact-channels-bar" id="canales">
              <a href="#canales" className="channel-card-link" style={{ borderColor: 'rgba(37, 211, 102, 0.4)' }}>
                <span style={{ fontSize: '20px' }}>💬</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--wa-green)', fontWeight: 700 }}>WHATSAPP DIRECTO</div>
                  <div style={{ fontSize: '13.5px' }}>Atención Inmediata 24/7</div>
                </div>
              </a>

              <a href="#canales" className="channel-card-link" style={{ borderColor: 'rgba(24, 119, 242, 0.4)' }}>
                <span style={{ fontSize: '20px' }}>🌐</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700 }}>FACEBOOK MESSENGER</div>
                  <div style={{ fontSize: '13.5px' }}>Fan Pages Oficiales</div>
                </div>
              </a>

              <a href="#canales" className="channel-card-link" style={{ borderColor: 'rgba(220, 39, 67, 0.4)' }}>
                <span style={{ fontSize: '20px' }}>📸</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: '#f472b6', fontWeight: 700 }}>INSTAGRAM DIRECT</div>
                  <div style={{ fontSize: '13.5px' }}>Mensajes & Tiradas Rápidas</div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section className="section-services" id="servicios">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Consultas y Lecturas Especializadas</h2>
              <p className="section-description">Cada tirada es personalizada, analizando tus energías actuales con respeto y honestidad.</p>
            </div>

            <div className="services-grid">
              <article className="tarot-card">
                <div className="card-icon">❤️</div>
                <h3 className="card-title">Tarot del Amor y Pareja</h3>
                <p className="card-text">Claridad sobre sentimientos, intenciones reales, reconciliaciones y el rumbo de tu vínculo afectivo.</p>
                <a href="#canales" className="card-action">Consultar por WhatsApp →</a>
              </article>

              <article className="tarot-card">
                <div className="card-icon">🪙</div>
                <h3 className="card-title">Trabajo, Finanzas y Negocios</h3>
                <p className="card-text">Orientación sobre proyectos laborales, toma de decisiones económicas y desbloqueo de caminos profesionales.</p>
                <a href="#canales" className="card-action">Consultar por Messenger →</a>
              </article>

              <article className="tarot-card">
                <div className="card-icon">🌟</div>
                <h3 className="card-title">Tirada General y Destino</h3>
                <p className="card-text">Una visión integral de los próximos meses en salud, espiritualidad y los ciclos que estás por comenzar.</p>
                <a href="#canales" className="card-action">Consultar por Instagram →</a>
              </article>
            </div>
          </div>
        </section>

        {/* Confianza */}
        <section className="section-trust">
          <div className="container">
            <div className="trust-grid">
              <div className="trust-item">
                <h4>🔒 100% Confidencial</h4>
                <p>Tus consultas, nombres y situaciones son tratadas con absoluta reserva profesional.</p>
              </div>
              <div className="trust-item">
                <h4>⚡ Respuesta sin Esperas</h4>
                <p>Un bot de bienvenida toma tu solicitud y te asigna al instante con una tarotista activa.</p>
              </div>
              <div className="trust-item">
                <h4>🤝 Trato Humano y Cálido</h4>
                <p>Orientación sincera y empática, sin juzgar tus dudas ni tus circunstancias.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}

export default LandingPage;
