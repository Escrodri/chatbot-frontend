import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersService, ESTADOS, ORDEN_ESTADOS } from '../services/orders.service';
import { productsService } from '../services/products.service';
import { OrderBadge } from '../components/inbox/OrderBadge';

/**
 * Tablero de Pedidos: quién pagó y quién no.
 *
 * Esta pantalla reemplaza a la planilla de Google. Arriba de todo van los
 * comprobantes sin verificar, porque son los únicos que tienen a alguien
 * esperando del otro lado.
 */
export function PedidosPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [filtro, setFiltro] = useState('comprobante_recibido');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [lista, sum] = await Promise.all([
        ordersService.list(token, { status: filtro === 'todos' ? null : filtro }),
        ordersService.resumen(token)
      ]);
      setPedidos(Array.isArray(lista) ? lista : []);
      setResumen(Array.isArray(sum) ? sum : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const conteo = useMemo(() => {
    const mapa = {};
    resumen.forEach(r => { mapa[r.status] = { cantidad: r.cantidad, monto: Number(r.monto) || 0 }; });
    return mapa;
  }, [resumen]);

  const visibles = useMemo(() => {
    if (!busqueda.trim()) return pedidos;
    const q = busqueda.toLowerCase().trim();
    return pedidos.filter(p =>
      (p.contact_name || '').toLowerCase().includes(q) ||
      (p.contact_phone || '').toLowerCase().includes(q) ||
      (p.product_name || '').toLowerCase().includes(q)
    );
  }, [pedidos, busqueda]);

  const cambiar = async (pedido, nuevoEstado) => {
    if (nuevoEstado === 'pagado') {
      const ok = window.confirm(
        `Vas a marcar como PAGADO el pedido de ${pedido.contact_name || pedido.contact_phone}.\n\n` +
        `Confirmá solo si ya viste la transferencia en el extracto del banco. ` +
        `El comprobante que mandó el cliente no alcanza: una captura se edita o se reenvía.`
      );
      if (!ok) return;
    }

    setTrabajando(pedido.id);
    try {
      await ordersService.cambiarEstado(token, pedido.id, nuevoEstado);
      await cargar();
    } catch (err) {
      alert('No se pudo actualizar: ' + err.message);
    } finally {
      setTrabajando(null);
    }
  };

  const formatearFecha = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
      ' ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="admin-page">
      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '28px 20px 60px' }}>
        <header style={{ marginBottom: '22px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.6rem' }}>Pedidos</h2>
          <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '.92rem' }}>
            Quién pagó y quién no. Los comprobantes sin verificar van primero: son los que
            tienen a alguien esperando respuesta.
          </p>
        </header>

        {/* Resumen por estado */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '22px'
        }}>
          {ORDEN_ESTADOS.map(clave => {
            const cfg = ESTADOS[clave];
            const dato = conteo[clave] || { cantidad: 0, monto: 0 };
            const activo = filtro === clave;
            return (
              <button
                key={clave}
                type="button"
                onClick={() => setFiltro(clave)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${activo ? cfg.color : 'var(--border-gold, #e2e2e2)'}`,
                  background: activo ? cfg.fondo : 'var(--bg-card, #fff)',
                  cursor: 'pointer',
                  transition: 'all .15s'
                }}
              >
                <div style={{ fontSize: '1.55rem', fontWeight: 700, color: cfg.color, lineHeight: 1.1 }}>
                  {dato.cantidad}
                </div>
                <div style={{ fontSize: '.8rem', fontWeight: 600, marginTop: '3px' }}>{cfg.etiqueta}</div>
                {dato.monto > 0 && (
                  <div style={{ fontSize: '.75rem', color: 'var(--text-soft)', marginTop: '2px' }}>
                    {productsService.formatearPrecio(dato.monto, 'PYG')}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={`filter-pill ${filtro === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            Ver todos
          </button>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, teléfono o producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-gold, #ddd)' }}
          />
          <button type="button" className="btn-card-action" onClick={cargar} disabled={cargando}>
            {cargando ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,.12)', color: '#b91c1c', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Tabla */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px', background: 'var(--bg-card, #fff)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: '820px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-soft, #fafafa)', textAlign: 'left' }}>
                <th style={{ padding: '11px 14px', fontWeight: 600 }}>Cliente</th>
                <th style={{ padding: '11px 14px', fontWeight: 600 }}>Producto</th>
                <th style={{ padding: '11px 14px', fontWeight: 600, textAlign: 'right' }}>Monto</th>
                <th style={{ padding: '11px 14px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '11px 14px', fontWeight: 600 }}>Actualizado</th>
                <th style={{ padding: '11px 14px', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && !cargando && (
                <tr>
                  <td colSpan={6} style={{ padding: '34px 14px', textAlign: 'center', color: 'var(--text-soft)' }}>
                    No hay pedidos con este filtro.
                  </td>
                </tr>
              )}

              {visibles.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border-gold, #eee)' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: 600 }}>{p.contact_name || 'Sin nombre'}</div>
                    <div style={{ color: 'var(--text-soft)', fontSize: '.8rem' }}>{p.contact_phone || '—'}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>{p.product_name || <span style={{ color: 'var(--text-soft)' }}>Sin definir</span>}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {p.amount ? productsService.formatearPrecio(p.amount, p.currency) : '—'}
                  </td>
                  <td style={{ padding: '11px 14px' }}><OrderBadge status={p.status} /></td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-soft)', fontSize: '.82rem', whiteSpace: 'nowrap' }}>
                    {formatearFecha(p.updated_at)}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-card-action"
                        style={{ fontSize: '.78rem', padding: '5px 10px' }}
                        onClick={() => navigate(`/inbox?conversation=${p.conversation_id}`)}
                      >
                        Abrir chat
                      </button>

                      {(p.status === 'comprobante_recibido' || p.status === 'interesado') && (
                        <button
                          type="button"
                          disabled={trabajando === p.id}
                          onClick={() => cambiar(p, 'pagado')}
                          style={{
                            fontSize: '.78rem', padding: '5px 10px', borderRadius: '6px',
                            border: '1px solid #04785733', background: 'rgba(16,185,129,.16)',
                            color: '#047857', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Confirmar pago
                        </button>
                      )}

                      {p.status === 'pagado' && (
                        <button
                          type="button"
                          disabled={trabajando === p.id}
                          onClick={() => cambiar(p, 'entregado')}
                          style={{
                            fontSize: '.78rem', padding: '5px 10px', borderRadius: '6px',
                            border: '1px solid #065f4633', background: 'rgba(5,150,105,.14)',
                            color: '#065f46', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Marcar entregado
                        </button>
                      )}

                      {p.status === 'comprobante_recibido' && (
                        <button
                          type="button"
                          disabled={trabajando === p.id}
                          onClick={() => cambiar(p, 'rechazado')}
                          style={{
                            fontSize: '.78rem', padding: '5px 10px', borderRadius: '6px',
                            border: '1px solid #b91c1c33', background: 'rgba(239,68,68,.12)',
                            color: '#b91c1c', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Rechazar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: '14px', fontSize: '.82rem', color: 'var(--text-soft)' }}>
          El bot puede marcar un pedido como <strong>Verificar</strong> cuando llega un comprobante,
          pero no puede marcarlo como pagado: eso lo confirma una persona después de ver la
          transferencia en el banco. El backend rechaza esa transición si viene del bot.
        </p>
      </main>
    </div>
  );
}

export default PedidosPage;
