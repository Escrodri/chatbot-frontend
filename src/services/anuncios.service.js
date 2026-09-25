import { apiUrl } from '../lib/api';

/**
 * De qué anuncio viene la gente y cuánto vende cada uno.
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

export const anunciosService = {
  async rendimiento(token, periodo = 'hoy') {
    const res = await fetch(apiUrl(`/api/anuncios?periodo=${encodeURIComponent(periodo)}`), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  async nombrar(token, adId, datos) {
    const res = await fetch(apiUrl(`/api/anuncios/${encodeURIComponent(adId)}`), {
      method: 'PATCH',
      headers: authHeaders(token),
      credentials: 'include',
      body: JSON.stringify(datos)
    });
    return parse(res);
  },

  async sincronizar(token) {
    const res = await fetch(apiUrl('/api/anuncios/sincronizar'), {
      method: 'POST',
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  async importar(token, texto) {
    const res = await fetch(apiUrl('/api/anuncios/importar'), {
      method: 'POST',
      headers: authHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ texto })
    });
    return parse(res);
  }
};

export default anunciosService;
