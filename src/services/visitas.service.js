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
  }
};

export default visitasService;
