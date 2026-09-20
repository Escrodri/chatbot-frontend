import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ordersService } from '../../services/orders.service';
import { productsService } from '../../services/products.service';
import { OrderBadge } from './OrderBadge';

/**
 * El pedido de esta conversación, al lado del chat.
 *
 * Reemplaza a tres botones del panel derecho que no hacían nada. La idea es
 * que el asesor confirme un pago sin salir del chat donde está viendo el
 * comprobante: tener que ir a otra pantalla para eso es justo el viaje que
 * antes obligaba a hacer la planilla.
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

  const cambiar = async (pedido, estado) => {
    if (estado === 'pagado') {
      const ok = window.confirm(
        `Vas a marcar como PAGADO el pedido de ${contactName || 'este contacto'}.\n\n` +
        'Confirmá solo si ya viste la transferencia en el extracto del banco. ' +
        'El comprobante que mandó el cliente no alcanza: una captura se edita o se reenvía.'
      );
      if (!ok) return;
    }
    setTrabajando(pedido.id);
    try {
      await ordersService.cambiarEstado(token, pedido.id, estado);
      await cargar();
    } catch (err) {
      alert('No se pudo actualizar: ' + err.message);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
              <OrderBadge status={p.status} />
              <span style={{ fontSize: '.72rem', color: 'var(--text-soft)' }}>#{p.id}</span>
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
              {(p.status === 'comprobante_recibido' || p.status === 'interesado') && (
                <button type="button" disabled={trabajando === p.id}
                  onClick={() => cambiar(p, 'pagado')}
                  style={btn('#047857', 'rgba(16,185,129,.16)')}>
                  Confirmar pago
                </button>
              )}

              {p.status === 'pagado' && (
                <button type="button" disabled={trabajando === p.id}
                  onClick={() => cambiar(p, 'entregado')}
                  style={btn('#065f46', 'rgba(5,150,105,.14)')}>
                  Marcar entregado
                </button>
              )}

              {p.status === 'comprobante_recibido' && (
                <button type="button" disabled={trabajando === p.id}
                  onClick={() => cambiar(p, 'rechazado')}
                  style={btn('#b91c1c', 'transparent')}>
                  Rechazar comprobante
                </button>
              )}

              {['pagado', 'entregado'].includes(p.status) && p.delivery_url && (
                <a href={p.delivery_url} target="_blank" rel="noreferrer"
                  style={{ ...btn('#1d4ed8', 'rgba(59,130,246,.12)'), textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                  Ver enlace de entrega
                </a>
              )}
            </div>

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
