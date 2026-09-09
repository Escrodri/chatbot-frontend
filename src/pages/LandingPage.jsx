import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2.1c-.2-.3 0-.4.1-.6l.5-.6c.1-.2.2-.3.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5H8c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.4 5.3 4.7 2.6 1 3.1.8 3.7.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4z" />
      <path d="M12 2A9.9 9.9 0 0 0 2.1 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4A9.9 9.9 0 1 0 12 2zm0 18.1c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3a8.2 8.2 0 1 1 7.2 3.9z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.3 2 2 6.2 2 11.8c0 3 1.3 5.6 3.5 7.4v3.3l3.2-1.8c.9.2 1.8.4 2.8.4 5.7 0 10-4.2 10-9.8S17.7 2 12 2zm1 12.8-2.6-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.3 5.7z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LandingPage() {
  return (
    <>
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="hero-tarot">
          <div className="container">
            <div className="hero-tag">
              <span>Una sola bandeja para todos tus mensajes</span>
            </div>

            <h1 className="hero-heading">
              Atendé WhatsApp, Messenger e Instagram <span>desde un mismo lugar</span>
            </h1>

            <p className="hero-subheading">
              Todos los mensajes de tus clientes llegan a una bandeja compartida. Tu equipo responde
              en tiempo real, sin pasarse el celular y sin perder ninguna consulta de venta.
            </p>

            <div className="hero-ctas">
              <a href="#canales" className="btn btn-gold">
                <span>Escribinos ahora</span>
              </a>
              <Link to="/login" className="btn btn-outline-gold">
                <span>Acceso del equipo</span>
              </Link>
            </div>

            {/* Canales de contacto */}
            <div className="contact-channels-bar" id="canales">
              <a href="#canales" className="channel-card-link">
                <span className="channel-glyph wa"><WhatsAppIcon /></span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '0.4px' }}>WHATSAPP</div>
                  <div style={{ fontWeight: 600 }}>Atención inmediata</div>
                </div>
              </a>

              <a href="#canales" className="channel-card-link">
                <span className="channel-glyph fb"><MessengerIcon /></span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '0.4px' }}>MESSENGER</div>
                  <div style={{ fontWeight: 600 }}>Página oficial</div>
                </div>
              </a>

              <a href="#canales" className="channel-card-link">
                <span className="channel-glyph ig"><InstagramIcon /></span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-soft)', letterSpacing: '0.4px' }}>INSTAGRAM</div>
                  <div style={{ fontWeight: 600 }}>Mensajes directos</div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="section-services" id="servicios">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Cómo funciona</h2>
              <p className="section-description">
                Pensado para vender: nadie espera, nadie se pisa y todo queda registrado.
              </p>
            </div>

            <div className="services-grid">
              <article className="tarot-card">
                <div className="card-icon">1</div>
                <h3 className="card-title">Todo llega a la misma bandeja</h3>
                <p className="card-text">
                  Los mensajes de WhatsApp, Messenger e Instagram entran a una sola lista de
                  conversaciones, con filtro por canal y buscador.
                </p>
                <a href="#canales" className="card-action">Ver canales →</a>
              </article>

              <article className="tarot-card">
                <div className="card-icon">2</div>
                <h3 className="card-title">Respuesta automática de bienvenida</h3>
                <p className="card-text">
                  Un saludo configurable contesta al instante para que nadie quede esperando,
                  y se silencia solo apenas una persona toma el chat.
                </p>
                <a href="#canales" className="card-action">Escribinos →</a>
              </article>

              <article className="tarot-card">
                <div className="card-icon">3</div>
                <h3 className="card-title">Dos personas, un mismo WhatsApp</h3>
                <p className="card-text">
                  Cada operador entra con su propio usuario y responde desde la misma cuenta.
                  Se ve quién contestó qué y en qué momento.
                </p>
                <Link to="/login" className="card-action">Entrar al panel →</Link>
              </article>
            </div>
          </div>
        </section>

        {/* Confianza */}
        <section className="section-trust">
          <div className="container">
            <div className="trust-grid">
              <div className="trust-item">
                <h4>Canales oficiales de Meta</h4>
                <p>Integración con WhatsApp Cloud API, Messenger e Instagram Graph API. Sin apps no oficiales.</p>
              </div>
              <div className="trust-item">
                <h4>Respuesta en segundos</h4>
                <p>Bandeja en tiempo real con avisos de mensajes nuevos y contadores de no leídos.</p>
              </div>
              <div className="trust-item">
                <h4>Tus datos protegidos</h4>
                <p>Credenciales cifradas y acceso restringido solo al equipo autorizado.</p>
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
