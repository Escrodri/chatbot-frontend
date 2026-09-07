/**
 * OmniMeta Platform - Frontend Client Application
 * Gestión de Rutas SPA, Verificación de Estado del Backend y Mockup Interactivo.
 */

const API_BASE_URL = 'http://localhost:3000';

// Configuración de Vistas
const VIEWS = {
  HOME: 'view-home',
  PRIVACY: 'view-privacy',
  TERMS: 'view-terms',
  DELETION: 'view-deletion',
  LOGIN: 'view-login'
};

/**
 * Enrutador basado en Hash del Navegador
 */
function handleRouting() {
  const hash = window.location.hash || '#/';
  
  // Ocultar todas las vistas
  document.getElementById(VIEWS.HOME).style.display = 'none';
  document.getElementById(VIEWS.PRIVACY).classList.remove('active');
  document.getElementById(VIEWS.TERMS).classList.remove('active');
  document.getElementById(VIEWS.DELETION).classList.remove('active');
  document.getElementById(VIEWS.LOGIN).classList.remove('active');

  // Actualizar estados activos del navbar
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  if (hash === '#/privacidad') {
    document.getElementById(VIEWS.PRIVACY).classList.add('active');
    document.getElementById('nav-link-privacy')?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (hash === '#/terminos') {
    document.getElementById(VIEWS.TERMS).classList.add('active');
    document.getElementById('nav-link-terms')?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (hash === '#/eliminacion-de-datos') {
    document.getElementById(VIEWS.DELETION).classList.add('active');
    document.getElementById('nav-link-deletion')?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (hash === '#/login') {
    document.getElementById(VIEWS.LOGIN).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    // Vista Principal (Home)
    document.getElementById(VIEWS.HOME).style.display = 'block';
    document.getElementById('nav-link-home')?.classList.add('active');
  }
}

/**
 * Consulta el estado de salud del Backend (/health)
 */
async function checkBackendHealth() {
  const badgeText = document.getElementById('system-status-text');
  const badgeContainer = document.getElementById('system-status-badge');

  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      badgeText.textContent = `Backend Operativo • PostgreSQL 16 Conectado`;
      badgeContainer.style.background = 'rgba(16, 185, 129, 0.15)';
      badgeContainer.style.color = '#34d399';
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (err) {
    badgeText.textContent = `Backend en Espera (Inicia: npm run dev en backend)`;
    badgeContainer.style.background = 'rgba(239, 68, 68, 0.15)';
    badgeContainer.style.color = '#f87171';
  }
}

/**
 * Interactividad en la Vista Mockup de WhatsApp Web
 */
function initMockupInteractivity() {
  const chatItems = document.querySelectorAll('.mockup-chat-item');
  const headerTitle = document.querySelector('.mockup-header-title');
  const handoverBadge = document.getElementById('mockup-handover-status');
  const messagesContainer = document.querySelector('.mockup-messages');

  chatItems.forEach(item => {
    item.addEventListener('click', () => {
      chatItems.forEach(ci => ci.classList.remove('active'));
      item.classList.add('active');

      const channel = item.getAttribute('data-channel');
      const contactName = item.querySelector('.mockup-chat-name').textContent;

      if (channel === 'whatsapp') {
        headerTitle.textContent = `${contactName} • WhatsApp Ventas`;
        handoverBadge.innerHTML = '<span>👤</span> Atendido por Humano';
        handoverBadge.className = 'handover-pill';
        messagesContainer.innerHTML = `
          <div class="bubble bubble-inbound">
            Hola, buenas tardes. Quería consultar si tienen disponibilidad de entrega inmediata.
            <div class="bubble-meta">10:40</div>
          </div>
          <div class="bubble bubble-outbound" style="background: #1f2c34; border: 1px solid rgba(139, 92, 246, 0.3);">
            <div style="font-size: 11px; color: #c084fc; font-weight: 600; margin-bottom: 2px;">🤖 Chatbot OmniMeta</div>
            ¡Hola Carlos! Bienvenido a WhatsApp Ventas. Hemos recibido tu consulta y enseguida un asesor continuará la conversación.
            <div class="bubble-meta">10:40 <span class="check-double">✓✓</span></div>
          </div>
          <div class="bubble bubble-outbound">
            ¡Hola Carlos! Sí, disponemos de stock para entrega el día de hoy. ¿Para qué localidad sería el envío?
            <div class="bubble-meta">10:42 <span class="check-double">✓✓</span></div>
          </div>
          <div class="bubble bubble-inbound">
            Genial, sería para Capital. ¿Me compartes el enlace de pago?
            <div class="bubble-meta">10:43</div>
          </div>
        `;
      } else if (channel === 'messenger') {
        headerTitle.textContent = `${contactName} • Fan Page Facebook`;
        handoverBadge.innerHTML = '<span>🤖</span> Bot de Bienvenida Activo';
        handoverBadge.className = 'handover-pill bot';
        messagesContainer.innerHTML = `
          <div class="bubble bubble-inbound">
            ¡Hola! ¿A qué hora abren hoy en la sucursal Centro?
            <div class="bubble-meta">09:15</div>
          </div>
          <div class="bubble bubble-outbound" style="background: #1f2c34; border: 1px solid rgba(139, 92, 246, 0.3);">
            <div style="font-size: 11px; color: #c084fc; font-weight: 600; margin-bottom: 2px;">🤖 Chatbot OmniMeta</div>
            ¡Hola María! Gracias por escribirnos a Sucursal Centro. Nuestro horario es de 09:00 a 19:00 hs. En breve un asesor te ayudará.
            <div class="bubble-meta">09:15 <span class="check-double">✓✓</span></div>
          </div>
        `;
      } else if (channel === 'instagram') {
        headerTitle.textContent = `${contactName} • Instagram Direct`;
        handoverBadge.innerHTML = '<span>👤</span> Agente Asignado';
        handoverBadge.className = 'handover-pill';
        messagesContainer.innerHTML = `
          <div class="bubble bubble-inbound">
            Hola! Me interesó el diseño que publicaron en su última historia, ¿está disponible?
            <div class="bubble-meta">Ayer</div>
          </div>
          <div class="bubble bubble-outbound">
            ¡Hola Juan! Sí, nos quedan las últimas 3 unidades exclusivas en catálogo. ¿Deseas reservarla?
            <div class="bubble-meta">Ayer <span class="check-double">✓✓</span></div>
          </div>
        `;
      }
    });
  });
}

/**
 * Manejador del Formulario de Consulta de Eliminación de Datos
 */
function initDeletionForm() {
  const form = document.getElementById('form-check-deletion');
  const resultBox = document.getElementById('deletion-status-result');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeInput = document.getElementById('input-del-code');
    const code = codeInput.value.trim();

    if (!code) return;

    resultBox.style.display = 'block';
    resultBox.innerHTML = '⏳ Consultando registro en los servidores...';

    try {
      const res = await fetch(`${API_BASE_URL}/api/compliance/data-deletion-status?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        resultBox.style.background = 'rgba(16, 185, 129, 0.15)';
        resultBox.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        resultBox.style.color = '#6ee7b7';
        resultBox.innerHTML = `
          <strong>✅ Solicitud Verificada:</strong><br />
          • Código: <code>${data.confirmation_code}</code><br />
          • Estado: <strong>${data.status}</strong><br />
          • Detalle: ${data.message}
        `;
      } else {
        throw new Error('Código no encontrado');
      }
    } catch (err) {
      resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
      resultBox.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      resultBox.style.color = '#fca5a5';
      resultBox.innerHTML = `❌ No se encontró ninguna solicitud con el código provisto o el backend no está disponible.`;
    }
  });
}

/**
 * Toggle para mostrar u ocultar la contraseña en el Login
 */
function initPasswordToggle() {
  const toggleBtn = document.getElementById('btn-toggle-password');
  const passwordInput = document.getElementById('login-password');

  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleBtn.textContent = '🙈';
    } else {
      passwordInput.type = 'password';
      toggleBtn.textContent = '👁️';
    }
  });
}

// Inicialización de la Aplicación
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('hashchange', handleRouting);
  handleRouting();
  checkBackendHealth();
  initMockupInteractivity();
  initDeletionForm();
  initPasswordToggle();

  // Revisar estado del backend periódicamente
  setInterval(checkBackendHealth, 10000);
});
