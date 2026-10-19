import { apiUrl } from '../lib/api';

/**
 * Visitas a la landing (Plan 21): de dónde llega la gente, con qué anuncio,
 * conjunto y campaña. Lo arma el backend a partir de lo que la landing le manda.
 * Solo lo ve un administrador.
 */
export const visitasService = {
  async resumen(token, dias = 7) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(apiUrl(`/api/visitas/resumen?dias=${encodeURIComponent(dias)}`), {
      headers,
      credentials: 'include',
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(res.status === 401 || res.status === 403
        ? 'Esta sección es solo para administradores.'
        : (data.error || `Error ${res.status}`));
    }
    return data;
  },

  /** Elimina un evento puntual por su id o timestamp. */
  async eliminar(id, ts, token) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const url = id && !id.startsWith('mem_')
      ? apiUrl(`/api/visitas/${id}`)
      : apiUrl(`/api/visitas/mem?ts=${encodeURIComponent(ts || '')}`);

    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el evento');
    return data;
  },

  /** Limpia las pruebas: 'todas' para reset completo o 'sin_utm' para borrar solo pruebas directas. */
  async limpiar(tipo = 'todas', token) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(apiUrl(`/api/visitas/limpiar?tipo=${encodeURIComponent(tipo)}`), {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudieron limpiar las visitas');
    return data;
  }
};

export default visitasService;
