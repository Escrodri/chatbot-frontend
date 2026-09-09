/**
 * Dirección del backend.
 *
 * Prioridad:
 *   1. VITE_API_URL, si está definida al compilar. Es la forma correcta de
 *      configurarlo por entorno (Cloudflare Pages, Vercel, etc.).
 *   2. Si no está definida y el sitio NO corre en localhost, se usa la URL de
 *      producción de más abajo. Así el sitio publicado funciona aunque alguien
 *      olvide cargar la variable en el panel del hosting.
 *   3. En localhost queda vacía a propósito: el proxy de vite.config.js manda
 *      /api y /health a http://localhost:3000.
 *
 * Vite reemplaza import.meta.env.VITE_API_URL en tiempo de COMPILACIÓN, no de
 * ejecución: si cambiás la URL del backend hay que volver a compilar.
 */

// Backend en Render. Cambiar acá si algún día se muda de proveedor o de dominio.
const BACKEND_PRODUCCION = 'https://chatbot-backend-aq9n.onrender.com';

const HOSTS_LOCALES = ['localhost', '127.0.0.1', '[::1]', '::1'];

function resolverBase() {
  const configurada = (import.meta.env?.VITE_API_URL || '').trim();
  if (configurada) return configurada;

  // Sin variable: decidimos según dónde se está sirviendo la página.
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (!HOSTS_LOCALES.includes(host)) return BACKEND_PRODUCCION;
  }

  return '';
}

// Sin barra final, para poder concatenar rutas que empiezan con "/".
export const API_BASE = resolverBase().replace(/\/+$/, '');

/** Convierte una ruta relativa ("/api/...") en la URL absoluta del backend. */
export function apiUrl(path = '') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export default { API_BASE, apiUrl };
