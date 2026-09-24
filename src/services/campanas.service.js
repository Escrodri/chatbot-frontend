import { apiUrl } from '../lib/api';

/**
 * Campañas de precio: remarketing y promos con fecha.
 *
 * El precio de cada persona lo decide el backend. Esto solo crea, lista y
 * apaga campañas.
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

export const campanasService = {
  async listar(token) {
    const res = await fetch(apiUrl('/api/campanas'), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  async crear(token, campana) {
    const res = await fetch(apiUrl('/api/campanas'), {
      method: 'POST',
      headers: authHeaders(token),
      credentials: 'include',
      body: JSON.stringify(campana)
    });
    return parse(res);
  },

  async cambiar(token, id, cambios) {
    const res = await fetch(apiUrl(`/api/campanas/${id}`), {
      method: 'PATCH',
      headers: authHeaders(token),
      credentials: 'include',
      body: JSON.stringify(cambios)
    });
    return parse(res);
  }
};

export default campanasService;
