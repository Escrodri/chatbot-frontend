import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';

export function TermsPage() {
  return (
    <>
      <PublicHeader />

      <main className="container page-legal">
        <h1>Términos de Servicio</h1>
        <div className="date-meta">Última actualización: 7 de Septiembre de 2026 • Dominio: lecturasdetarte.online</div>

        <p>
          Bienvenido a <strong>Lecturas de Tarot Online</strong> (<code>lecturasdetarte.online</code>).
          Al acceder a nuestro sitio web o iniciar una conversación a través de nuestros canales oficiales
          de WhatsApp, Facebook Messenger o Instagram Direct, usted acepta los presentes Términos de Servicio.
        </p>

        <h2>1. Naturaleza del Servicio</h2>
        <p>
          Nuestros servicios consisten en lecturas espirituales, interpretación simbólica de los arcanos del tarot y
          orientación personal. Las lecturas no constituyen asesoramiento médico, legal, financiero ni psicológico
          profesional. El usuario es el único responsable de sus decisiones y actos.
        </p>

        <h2>2. Mayoría de Edad</h2>
        <p>
          El servicio está destinado exclusivamente a personas mayores de 18 años (o la mayoría de edad legal en su
          jurisdicción). Al contactarnos, usted declara bajo juramento cumplir con este requisito.
        </p>

        <h2>3. Uso Responsable y Canales Autorizados</h2>
        <p>
          Las consultas se canalizan a través de las APIs oficiales de Meta Graph API v21.0. Queda estrictamente prohibido
          el uso de lenguaje ofensivo, amenazas o intentos de vulnerar la seguridad de nuestros sistemas.
        </p>

        <h2>4. Precios y Pagos</h2>
        <p>
          Cualquier tarifa aplicable a tiradas extendidas será informada con total transparencia por la tarotista antes de
          iniciar la sesión. No existen cargos ocultos ni renovaciones automáticas no consentidas.
        </p>

        <h2>5. Contacto Legal</h2>
        <p>
          Para cualquier consulta o aclaración respecto a estos términos, puede comunicarse a:{' '}
          <strong style={{ color: 'var(--gold-light)' }}>contacto@lecturasdetarte.online</strong>.
        </p>
      </main>

      <PublicFooter />
    </>
  );
}

export default TermsPage;
