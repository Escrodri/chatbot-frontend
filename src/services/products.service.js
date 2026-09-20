import { apiUrl } from '../lib/api';

/**
 * Catálogo de productos digitales.
 *
 * Una sola fuente de verdad: esto pega contra /api/products, la misma tabla que
 * lee el bot de n8n. Cambiar un precio acá lo cambia también para el bot, en el
 * mismo momento. Antes el catálogo estaba escrito a mano dentro del flujo.
 */
function authHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const productsService = {
  /** Catálogo completo. `todos: true` incluye los desactivados (solo admin). */
  async list(token, { todos = false } = {}) {
    const res = await fetch(apiUrl(`/api/products${todos ? '?all=true' : ''}`), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  async create(token, producto) {
    const res = await fetch(apiUrl('/api/products'), {
      method: 'POST',
      headers: authHeaders(token),
      credentials: 'include',
      body: JSON.stringify(producto)
    });
    return parse(res);
  },

  async update(token, id, cambios) {
    const res = await fetch(apiUrl(`/api/products/${id}`), {
      method: 'PUT',
      headers: authHeaders(token),
      credentials: 'include',
      body: JSON.stringify(cambios)
    });
    return parse(res);
  },

  /** Baja lógica: deja de ofrecerse, pero las ventas viejas siguen teniendo sentido. */
  async desactivar(token, id) {
    const res = await fetch(apiUrl(`/api/products/${id}`), {
      method: 'DELETE',
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  formatearPrecio(valor, moneda = 'PYG') {
    const n = Number(valor) || 0;
    const locales = { PYG: 'es-PY', USD: 'en-US', BRL: 'pt-BR', ARS: 'es-AR' };
    const simbolos = { PYG: 'Gs.', USD: 'US$', BRL: 'R$', ARS: '$' };
    const txt = new Intl.NumberFormat(locales[moneda] || 'es-PY', {
      maximumFractionDigits: moneda === 'PYG' ? 0 : 2
    }).format(n);
    return `${simbolos[moneda] || ''} ${txt}`.trim();
  }
};

export default productsService;
