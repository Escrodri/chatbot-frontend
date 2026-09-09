import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';

export function PrivacyPage() {
  return (
    <>
      <PublicHeader />

      <main className="container page-legal">
        <h1>Política de Privacidad</h1>
        <div className="date-meta">Última actualización: 8 de Septiembre de 2026 • Dominio: lecturasdetarde.online</div>

        <p>
          En <strong>Bandeja Unificada</strong> (sitio web: <code>lecturasdetarde.online</code>),
          la privacidad y la confidencialidad de quienes nos escriben son un compromiso central de nuestro servicio de atención. Esta Política de Privacidad
          explica de forma transparente cómo recopilamos, utilizamos y protegemos su información cuando se comunica con
          nosotros a través de WhatsApp, Facebook Messenger o Instagram Direct.
        </p>

        <h2>1. Responsable del Tratamiento de Datos</h2>
        <p>
          El responsable del tratamiento de los datos recabados en este sitio web y a través de los canales oficiales de
          mensajería es el equipo administrador de <strong>lecturasdetarde.online</strong>. Si tiene preguntas o desea
          ejercer sus derechos de privacidad, puede escribirnos directamente a:{' '}
          <strong style={{ color: 'var(--gold-light)' }}>privacidad@lecturasdetarde.online</strong>.
        </p>

        <h2>2. Datos Personales que Tratamos</h2>
        <p>Únicamente recopilamos los datos estrictamente necesarios para prestar el servicio de atención y soporte:</p>
        <ul>
          <li><strong>Identificadores de Mensajería:</strong> Su número de teléfono (en caso de WhatsApp) o su identificador público de usuario (en Messenger e Instagram).</li>
          <li><strong>Nombre o Alias:</strong> El nombre de perfil que usted utiliza en la aplicación de mensajería para dirigirnos a usted con respeto.</li>
          <li><strong>Contenido de la Consulta:</strong> Las preguntas, dudas o inquietudes que usted comparte voluntariamente con nuestro equipo de atención.</li>
        </ul>

        <h2>3. Finalidad del Tratamiento</h2>
        <p>Sus datos se utilizan con las siguientes finalidades legítimas:</p>
        <ul>
          <li>Responder en tiempo real sus consultas sobre productos, precios, disponibilidad y postventa.</li>
          <li>Despachar un saludo inicial y orientador mediante nuestro bot de bienvenida automático antes de asignarle un operador humano.</li>
          <li>Mantener el historial de la conversación para dar seguimiento a consultas y pedidos previos.</li>
        </ul>

        <h2>4. Confidencialidad y Seguridad</h2>
        <p>Nos comprometemos a salvaguardar la reserva de sus comunicaciones:</p>
        <ul>
          <li><strong>Cero Venta de Información:</strong> Jamás vendemos, alquilamos ni compartimos sus datos con terceros.</li>
          <li><strong>Cifrado y Protección:</strong> Las comunicaciones se realizan bajo protocolos seguros con cifrado de grado industrial en reposo (AES-256-GCM) y en tránsito (TLS).</li>
          <li><strong>Acceso Restringido:</strong> Solo los operadores y el personal autorizado tienen acceso a los mensajes con el único fin de atender su consulta.</li>
        </ul>

        <h2>5. Sus Derechos y Eliminación de Información</h2>
        <p>
          Usted puede en cualquier momento solicitar una copia de sus datos, rectificarlos o pedir su eliminación total y definitiva de nuestros registros.
          Para ejercer su derecho al olvido, puede utilizar nuestro formulario directo en la sección de{' '}
          <Link to="/eliminacion-de-datos" style={{ color: 'var(--gold-primary)' }}>Eliminación de Datos</Link>{' '}
          o escribir a <strong>privacidad@lecturasdetarde.online</strong>.
        </p>
      </main>

      <PublicFooter />
    </>
  );
}

export default PrivacyPage;
