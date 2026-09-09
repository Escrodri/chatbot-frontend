import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';

export function TermsPage() {
  return (
    <>
      <PublicHeader />

      <main className="container page-legal">
        <h1>Términos de Servicio</h1>
        <div className="date-meta">Última actualización: 8 de Septiembre de 2026 • Dominio: lecturasdetarde.online</div>

        <p>
          Bienvenido a <strong>Bandeja Unificada</strong> (<code>lecturasdetarde.online</code>).
          Al acceder a nuestro sitio web o iniciar una conversación a través de nuestros canales oficiales
          de WhatsApp, Facebook Messenger o Instagram Direct, usted acepta los presentes Términos de Servicio.
        </p>

        <h2>1. Naturaleza del Servicio</h2>
        <p>
          Bandeja Unificada es un servicio de atención al cliente que centraliza las conversaciones recibidas
          por WhatsApp, Facebook Messenger e Instagram Direct para responder consultas, brindar información
          sobre productos y servicios, y dar seguimiento comercial.
        </p>

        <h2>2. Mayoría de Edad</h2>
        <p>
          Para iniciar conversaciones, realizar consultas o efectuar compras se requiere contar con la edad legal
          de consentimiento o la autorización correspondiente de un adulto responsable.
        </p>

        <h2>3. Uso Responsable y Canales Autorizados</h2>
        <p>
          Las consultas se canalizan a través de las APIs oficiales de Meta Graph API. Queda estrictamente prohibido
          el uso de lenguaje ofensivo, spam o intentos de vulnerar la seguridad de nuestros sistemas.
        </p>

        <h2>4. Contenidos y Servicios</h2>
        <p>
          La información, presupuestos y respuestas brindadas por nuestros operadores son orientativas y buscan
          acompañar su consulta con transparencia. Los precios y la disponibilidad pueden variar y se confirman
          al momento de cerrar la operación.
        </p>

        <h2>5. Contacto Legal</h2>
        <p>
          Para cualquier consulta o aclaración respecto a estos términos, puede comunicarse a:{' '}
          <strong style={{ color: 'var(--gold-light)' }}>contacto@lecturasdetarde.online</strong>.
        </p>
      </main>

      <PublicFooter />
    </>
  );
}

export default TermsPage;
