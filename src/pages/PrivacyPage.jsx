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

        <h2>5. Uso de las Plataformas de Meta</h2>
        <p>
          Este servicio funciona sobre las interfaces oficiales de Meta Platforms y su uso se rige por las
          Condiciones de la Plataforma y las Políticas para Desarrolladores de Meta. Concretamente utilizamos:
        </p>
        <ul>
          <li><strong>WhatsApp Business Cloud API:</strong> para recibir y responder los mensajes que usted nos envía por WhatsApp.</li>
          <li><strong>Plataforma de Messenger:</strong> para recibir y responder los mensajes dirigidos a nuestras páginas de Facebook.</li>
          <li><strong>API de mensajería de Instagram:</strong> para recibir y responder los mensajes directos de nuestra cuenta de Instagram.</li>
        </ul>
        <p>Los permisos que solicitamos a Meta y el uso exacto que damos a cada uno son los siguientes:</p>
        <ul>
          <li><code>pages_show_list</code>: mostrarle al administrador la lista de sus páginas para que elija cuáles conectar.</li>
          <li><code>pages_messaging</code>: recibir los mensajes enviados a la página y responderlos desde esta bandeja. Incluye leer el nombre y la foto de perfil de quien escribe, con el único fin de identificar la conversación dentro de la bandeja.</li>
          <li><code>pages_manage_metadata</code>: suscribir la página a las notificaciones de mensajes nuevos.</li>
          <li><code>instagram_basic</code> e <code>instagram_manage_messages</code>: los equivalentes anteriores para la cuenta de Instagram.</li>
        </ul>
        <p>
          No utilizamos ninguno de estos datos con fines publicitarios, no los cedemos a anunciantes, no los empleamos
          para entrenar modelos de inteligencia artificial ni para ningún propósito distinto de atender su consulta.
        </p>

        <h2>6. Conservación de los Datos y Proveedores</h2>
        <p>
          Conservamos el historial de conversaciones mientras la relación comercial siga vigente y, como máximo,
          durante veinticuatro meses desde su último mensaje. Cumplido ese plazo, o antes si usted lo solicita,
          los datos se eliminan de forma definitiva.
        </p>
        <p>
          Para prestar el servicio nos apoyamos en proveedores de infraestructura que actúan como encargados del
          tratamiento y solo procesan los datos siguiendo nuestras instrucciones: <strong>Render</strong>
          (alojamiento de la aplicación y de la base de datos, con servidores en los Estados Unidos) y
          <strong> Cloudinary</strong> (almacenamiento de las imágenes, audios y documentos intercambiados en las
          conversaciones). No intervienen otros terceros.
        </p>

        <h2>7. Sus Derechos y Eliminación de Información</h2>
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
