import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ordersService, ESTADOS } from '../../services/orders.service';
import { productsService } from '../../services/products.service';
import { OrderBadge } from './OrderBadge';

/**
 * El pedido de esta conversación, al lado del chat.
 *
 * Permite al asesor ver el estado del pedido y cambiarlo a cualquiera de los
 * 5 estados en cualquier momento, además de confirmar pagos y despachar enlaces
 * directamente desde la conversación.
 */
export function OrderPanel({ conversationId, contactName, onClose }) {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(null);

  const cargar = useCallback(async () => {
    if (!conversationId) return;
    setCargando(true);
    setError(null);
    try {
      const data = await ordersService.porConversacion(token, conversationId);
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, conversationId]);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmarPagoYEntregar = async (pedido) => {
    if (!pedido.product_entregable) {
      alert(
        `El producto "${pedido.product_name || 'sin nombre'}" no tiene enlace de entrega cargado.\n\n` +
        `Cárgalo primero en la sección de Productos antes de confirmar el pago y la entrega.`
      );
      return;
    }

    const ok = window.confirm(
      `Vas a confirmar el pago de ${contactName || 'este contacto'} por "${pedido.product_name || 'este producto'}".\n\n` +
      'Se le enviará el enlace de descarga automáticamente por WhatsApp.\n\n' +
      'Confirmá solo si ya viste la transferencia en el extracto del banco. El comprobante que mandó el cliente no alcanza: una captura se edita o se reenvía.'
    );
    if (!ok) return;

    setTrabajando(pedido.id);
    try {
      await ordersService.cambiarEstado(token, pedido.id, 'pagado', { notify: true });
      await cargar();
    } catch (err) {
      alert('No se pudo confirmar: ' + err.message);
    } finally {
      setTrabajando(null);
    }
  };

  const cambiarEstadoManual = async (pedido, nuevoEstado) => {
    if (!nuevoEstado || nuevoEstado === pedido.status) return;

    // Este desplegable cambiaba el estado con un solo clic y sin preguntar.
    // Marcar "Entregado" por error daba la venta por cerrada, no le mandaba
    // nada al cliente, y sacaba el pedido de la lista de pendientes: nadie se
    // enteraba hasta que el cliente reclamara.
    //
    // Y "Pagado" desde acá tampoco entrega, que es justo lo que uno espera que
    // haga. Por eso cada texto dice qué NO pasa.
    const textos = {
      entregado: `Vas a marcar el pedido de ${contactName || 'este contacto'} como ENTREGADO.\n\n` +
        'Esto NO le manda el material: solo deja registrado que ya lo recibió. ' +
        'Si todavía no se lo mandaste, cerrá esto y usá "Confirmar pago y entregar".',
      pagado: 'Vas a marcar el pedido como PAGADO, sin entregar.\n\n' +
        'No le llega ningún mensaje ni el enlace de descarga. Para cobrar Y entregar, ' +
        'usá el botón de confirmar.',
      rechazado: 'Vas a marcar el pedido como RECHAZADO.\n\n' +
        'Esto no le avisa nada al cliente: es solo el registro.'
    };

    const ok = window.confirm(
      textos[nuevoEstado] ||
      `Vas a cambiar el estado del pedido a "${nuevoEstado}".\n\nEsto no le manda ningún mensaje al cliente.`
    );
    if (!ok) return;

    setTrabajando(pedido.id);
    try {
      await ordersService.cambiarEstado(token, pedido.id, nuevoEstado, { notify: false });
      await cargar();
    } catch (err) {
      alert('No se pudo cambiar el estado: ' + err.message);
    } finally {
      setTrabajando(null);
    }
  };

  const rechazarComprobante = async (pedido) => {
    const ok = window.confirm(
      `¿Rechazar comprobante de ${contactName || 'este contacto'} y avisarle por WhatsApp que no figura acreditado?`
    );
    if (!ok) return;

    setTrabajando(pedido.id);
    try {
      await ordersService.cambiarEstado(token, pedido.id, 'rechazado', { notify: true });
      await cargar();
    } catch (err) {
      alert('No se pudo rechazar: ' + err.message);
    } finally {
      setTrabajando(null);
    }
  };

  const btn = (color, fondo) => ({
    fontSize: '.78rem', padding: '6px 11px', borderRadius: '6px',
    border: `1px solid ${color}33`, background: fondo, color,
    fontWeight: 600, cursor: 'pointer', width: '100%'
  });

  return (
    <aside className="notes-panel" style={{
      display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--border-gold, #e2e2e2)',
      background: 'var(--bg-card, #fff)', width: '300px', flexShrink: 0
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--border-gold, #eee)'
      }}>
        <strong style={{ fontSize: '.95rem' }}>Pedido</strong>
        <button type="button" onClick={onClose} title="Cerrar"
          style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-soft)', lineHeight: 1 }}>
          ×
        </button>
      </header>

      <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
        {cargando && <p style={{ color: 'var(--text-soft)', fontSize: '.85rem' }}>Cargando…</p>}

        {error && (
          <p style={{ color: '#b91c1c', fontSize: '.84rem' }}>{error}</p>
        )}

        {!cargando && !error && pedidos.length === 0 && (
          <p style={{ color: 'var(--text-soft)', fontSize: '.85rem', lineHeight: 1.5 }}>
            Esta conversación todavía no tiene un pedido abierto. Se crea solo cuando
            la persona pregunta por precios o manda un comprobante.
          </p>
        )}

        {pedidos.map(p => (
          <div key={p.id} style={{
            border: '1px solid var(--border-gold, #eee)', borderRadius: '9px',
            padding: '13px', marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px', gap: '8px' }}>
              <select
                value={p.status}
                disabled={trabajando === p.id}
                onChange={(e) => cambiarEstadoManual(p, e.target.value)}
                title="Cambiar estado del pedido libremente"
                style={{
                  fontSize: '.78rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${ESTADOS[p.status]?.color || '#ddd'}66`,
                  background: ESTADOS[p.status]?.fondo || '#fff',
                  color: ESTADOS[p.status]?.color || '#333',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                <option value="comprobante_recibido">🟡 Verificar (comprobante)</option>
                <option value="interesado">⚪ Interesado</option>
                <option value="pagado">🟢 Pagado</option>
                <option value="entregado">🟣 Entregado</option>
                <option value="rechazado">🔴 Rechazado</option>
              </select>
              <span style={{ fontSize: '.72rem', color: 'var(--text-soft)', flexShrink: 0 }}>#{p.id}</span>
            </div>

            <div style={{ fontSize: '.88rem', fontWeight: 600, marginBottom: '3px' }}>
              {p.product_name || 'Producto sin definir'}
            </div>
            {p.amount && (
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--wa-teal-dark, #047857)', marginBottom: '10px' }}>
                {productsService.formatearPrecio(p.amount, p.currency)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {p.status !== 'entregado' && (
                <button
                  type="button"
                  disabled={trabajando === p.id}
                  onClick={() => confirmarPagoYEntregar(p)}
                  style={btn('#047857', 'rgba(16,185,129,.16)')}
                >
                  {trabajando === p.id ? 'Enviando…' : (p.status === 'pagado' ? 'Reintentar entrega' : 'Confirmar pago y entregar')}
                </button>
              )}

              {(p.status === 'comprobante_recibido' || p.status === 'interesado') && (
                <button
                  type="button"
                  disabled={trabajando === p.id}
                  onClick={() => rechazarComprobante(p)}
                  style={btn('#b91c1c', 'rgba(239,68,68,.12)')}
                >
                  Rechazar comprobante
                </button>
              )}

              {p.status === 'rechazado' && (
                <button
                  type="button"
                  disabled={trabajando === p.id}
                  onClick={() => cambiarEstadoManual(p, 'comprobante_recibido')}
                  style={btn('#b45309', 'rgba(245,158,11,.16)')}
                >
                  Volver a Verificar
                </button>
              )}

              {['pagado', 'entregado'].includes(p.status) && p.delivery_url && (
                <a
                  href={p.delivery_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...btn('#1d4ed8', 'rgba(59,130,246,.12)'), textDecoration: 'none', textAlign: 'center', display: 'block' }}
                >
                  Ver enlace de entrega
                </a>
              )}

              {p.status === 'entregado' && p.product_entregable && (
                <button
                  type="button"
                  disabled={trabajando === p.id}
                  onClick={() => confirmarPagoYEntregar(p)}
                  style={btn('#047857', 'rgba(16,185,129,.10)')}
                >
                  {trabajando === p.id ? 'Enviando…' : 'Reenviar enlace por WhatsApp'}
                </button>
              )}
            </div>

            {p.product_id && !p.product_entregable && (
              <p style={{
                margin: '8px 0 0', fontSize: '.75rem', color: '#b45309',
                background: 'rgba(245,158,11,.12)', padding: '6px 8px', borderRadius: '6px'
              }}>
                ⚠️ Este producto no tiene enlace de entrega cargado.
              </p>
            )}

            {p.status === 'comprobante_recibido' && (
              <p style={{ margin: '10px 0 0', fontSize: '.75rem', color: 'var(--text-soft)', lineHeight: 1.45 }}>
                Mirá el comprobante en el chat y verificá la transferencia en el banco antes de confirmar.
              </p>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default OrderPanel;
