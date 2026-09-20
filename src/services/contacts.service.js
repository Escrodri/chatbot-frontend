import { apiUrl } from '../lib/api';

/**
 * Directorio de contactos.
 *
 * Antes esto guardaba una lista en localStorage: vivía solo en el navegador de
 * quien la abría, no la veía nadie más, y no tenía relación con la gente que
 * realmente había escrito. Ahora consulta la tabla `contacts` del backend, que
 * se llena sola con cada mensaje entrante.
 *
 * Por eso tampoco hay alta ni borrado: un contacto existe porque alguien te
 * escribió. Darlo de alta a mano sería inventar un dato.
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

export const contactsService = {
  async list(token, { platform = null, search = null, limit = 200 } = {}) {
    const q = new URLSearchParams();
    if (platform && platform !== 'all') q.set('platform', platform);
    if (search) q.set('search', search);
    q.set('limit', String(limit));

    const res = await fetch(apiUrl(`/api/contacts?${q.toString()}`), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  async stats(token) {
    const res = await fetch(apiUrl('/api/contacts/stats'), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  /** Exporta lo que está en pantalla. Se arma en el navegador, sin pedir nada. */
  exportarCSV(contactos = []) {
    const cabecera = ['Nombre', 'Telefono o usuario', 'Plataforma', 'Canal', 'Ultimo mensaje', 'Estado de venta'];
    const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const filas = contactos.map(c => [
      c.name,
      c.phone_or_username || c.platform_user_id,
      c.platform,
      c.channel_name,
      c.last_message_time ? new Date(c.last_message_time).toLocaleString('es-PY') : '',
      c.order_status || ''
    ].map(escapar).join(','));

    const csv = [cabecera.map(escapar).join(','), ...filas].join('\n');
    // El BOM hace que Excel abra bien los acentos.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contactos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export default contactsService;
