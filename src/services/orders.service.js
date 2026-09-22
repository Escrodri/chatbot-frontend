import { apiUrl } from '../lib/api';

/**
 * Pedidos: quién pagó y quién no.
 *
 * Esto reemplaza a la planilla de Google que se usaba antes. La diferencia que
 * importa no es el formato: es que el estado vive al lado de la conversación
 * que lo originó, así que el asesor abre un chat y ve en qué anda esa persona
 * sin cambiar de pestaña, y el bot lee el mismo dato para no cobrarle dos veces
 * a quien ya pagó.
 */
export const ESTADOS = {
  interesado:           { etiqueta: 'Interesado',   color: '#6b7280', fondo: 'rgba(107,114,128,.14)' },
  comprobante_recibido: { etiqueta: 'Verificar',    color: '#b45309', fondo: 'rgba(245,158,11,.18)' },
  pagado:               { etiqueta: 'Pagado',       color: '#047857', fondo: 'rgba(16,185,129,.16)' },
  entregado:            { etiqueta: 'Entregado',    color: '#065f46', fondo: 'rgba(5,150,105,.14)' },
  rechazado:            { etiqueta: 'Rechazado',    color: '#b91c1c', fondo: 'rgba(239,68,68,.15)' }
};

export const ORDEN_ESTADOS = ['comprobante_recibido', 'interesado', 'pagado', 'entregado', 'rechazado'];

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

export const ordersService = {
  async list(token, { status = null, phone = null, limit = 200 } = {}) {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (phone) q.set('phone', phone);
    q.set('limit', String(limit));

    const res = await fetch(apiUrl(`/api/orders?${q.toString()}`), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  async resumen(token) {
    const res = await fetch(apiUrl('/api/orders/summary'), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  async porConversacion(token, conversationId) {
    const res = await fetch(apiUrl(`/api/orders/conversation/${conversationId}`), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  /**
   * Cambia el estado del pedido.
   *
   * Marcar 'pagado' solo lo puede hacer una persona: el backend rechaza que lo
   * haga el bot. Un comprobante es una foto, y una foto se edita o se reenvía;
   * lo único que no se falsifica es el extracto del banco.
   */
  async cambiarEstado(token, id, status, extra = {}) {
    const res = await fetch(apiUrl(`/api/orders/${id}/status`), {
      method: 'PATCH',
      headers: authHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ status, ...extra })
    });
    return parse(res);
  },

  estado(clave) {
    return ESTADOS[clave] || ESTADOS.interesado;
  },

  /**
   * Traduce el resultado de la entrega a algo que se pueda leer.
   *
   * Vive acá y no en cada pantalla porque el chat y el tablero tienen que decir
   * lo mismo. Y porque el detalle técnico que devuelve el backend —"El producto
   * X no tiene enlace de entrega cargado"— se lee como si algo se hubiera roto,
   * cuando en realidad el pago quedó bien registrado y lo único que falta es un
   * dato de configuración.
   *
   * @param {object|null|undefined} entrega Lo que devolvió el backend en `entrega`
   * @returns {{ok: boolean, texto: string}}
   */
  describirEntrega(entrega) {
    if (entrega === null || entrega === undefined) {
      return { ok: true, texto: 'Estado actualizado.' };
    }

    if (entrega.enviado) {
      return { ok: true, texto: 'Mensaje enviado al cliente.' };
    }

    const motivos = {
      sin_enlace: 'El pago quedó registrado, pero este producto no tiene enlace de entrega. Cargalo en Productos y mandáselo a mano desde el chat.',
      sin_token: 'El pago quedó registrado, pero el canal no tiene token de Meta, así que el mensaje no salió.',
      sin_canal: 'El pago quedó registrado, pero el canal de este chat ya no existe.',
      meta_rechazo: 'El pago quedó registrado, pero Meta rechazó el envío. Podés reintentarlo con el mismo botón.',
      sin_conversacion: 'El pago quedó registrado, pero no se encontró la conversación.',
      sin_pedido: 'No se encontró el pedido.'
    };

    return {
      ok: false,
      texto: motivos[entrega.motivo] || 'El estado quedó guardado, pero el mensaje no salió.'
    };
  }
};

export default ordersService;
