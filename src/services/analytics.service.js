import { apiUrl } from '../lib/api';

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

export const analyticsService = {
  /**
   * Obtiene el dashboard consolidado de métricas comerciales:
   * - Ventas de hoy
   * - Rendimiento por producto (cuál vende más y cuál vende menos)
   * - Productividad de asesores (quién tuvo más conversaciones)
   * - Métricas por canal y tendencia diaria
   * 
   * @param {string} token Token de sesión
   * @param {object} params { periodo: 'hoy'|'7d'|'30d'|'mes'|'todo', desde, hasta }
   */
  async getDashboard(token, { periodo = '7d', desde = null, hasta = null } = {}) {
    const q = new URLSearchParams();
    if (periodo) q.set('periodo', periodo);
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);

    const res = await fetch(apiUrl(`/api/analytics/dashboard?${q.toString()}`), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  /** Formatear moneda (Guaraníes o USD) */
  formatearMonto(monto, moneda = 'PYG') {
    const val = Number(monto) || 0;
    if (moneda === 'USD') {
      return `$ ${val.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₲ ${val.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`;
  }
};

export default analyticsService;
