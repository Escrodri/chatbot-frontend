import { apiUrl } from '../lib/api';

/**
 * Etiquetas de conversación, compartidas por equipo.
 *
 * Antes vivían en el localStorage de cada navegador: el asesor que marcaba un
 * chat era el único que lo veía. Ahora están en la base y son del equipo, así
 * que el que abre el chat después ve lo que marcó su compañero.
 *
 * Son distintas del chip de venta (Pagado, Verificar, Sin pagar): ese lo pone
 * el sistema a partir del pedido. Estas las pone una persona.
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

export const COLORES = [
  '#2563eb', '#7c3aed', '#b45309', '#b91c1c', '#047857', '#0891b2', '#be185d', '#6b7280'
];

export const tagsService = {
  /** Catálogo del equipo. La primera vez el backend siembra un juego inicial. */
  async list(token) {
    const res = await fetch(apiUrl('/api/tags'), {
      headers: authHeaders(token), credentials: 'include'
    });
    return parse(res);
  },

  async create(token, { name, color }) {
    const res = await fetch(apiUrl('/api/tags'), {
      method: 'POST', headers: authHeaders(token), credentials: 'include',
      body: JSON.stringify({ name, color })
    });
    return parse(res);
  },

  async remove(token, id) {
    const res = await fetch(apiUrl(`/api/tags/${id}`), {
      method: 'DELETE', headers: authHeaders(token), credentials: 'include'
    });
    return parse(res);
  },

  async deConversacion(token, conversationId) {
    const res = await fetch(apiUrl(`/api/conversations/${conversationId}/tags`), {
      headers: authHeaders(token), credentials: 'include'
    });
    return parse(res);
  },

  async poner(token, conversationId, tagId) {
    const res = await fetch(apiUrl(`/api/conversations/${conversationId}/tags`), {
      method: 'POST', headers: authHeaders(token), credentials: 'include',
      body: JSON.stringify({ tag_id: tagId })
    });
    return parse(res);
  },

  async quitar(token, conversationId, tagId) {
    const res = await fetch(apiUrl(`/api/conversations/${conversationId}/tags/${tagId}`), {
      method: 'DELETE', headers: authHeaders(token), credentials: 'include'
    });
    return parse(res);
  }
};

export default tagsService;
