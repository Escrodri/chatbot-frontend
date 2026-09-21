import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersService, ESTADOS, ORDEN_ESTADOS } from '../services/orders.service';
import { productsService } from '../services/products.service';
import { OrderBadge } from '../components/inbox/OrderBadge';

/**
 * Tablero de Pedidos: quién pagó y quién no.
 *
 * Reemplaza a la planilla de Google. Se agrupa por cliente y no por pedido,
 * porque la pregunta que uno se hace mirando esto no es "¿cómo va el pedido
 * 47?" sino "¿qué le debo a esta persona?". Una misma persona puede tener
 * varios productos en estados distintos, y cada uno se confirma y se entrega
 * por separado.
 *
 * Arriba van los comprobantes sin verificar: son los únicos que tienen a
 * alguien esperando del otro lado.
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

  // Resultado de la última entrega, por pedido. Confirmar un pago dispara el
  // envío del enlace, y hay que decir si salió o no: antes esto era mudo.
  const [avisos, setAvisos] = useState({});

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

  /**
   * Agrupa por cliente. La clave es el teléfono, que es lo único estable: el
   * nombre lo pone el propio cliente en su perfil de WhatsApp y puede cambiar.
   */
  const clientes = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    const filtrados = !q ? pedidos : pedidos.filter(p =>
      (p.contact_name || '').toLowerCase().includes(q) ||
      (p.contact_phone || '').toLowerCase().includes(q) ||
      (p.product_name || '').toLowerCase().includes(q)
    );

    const mapa = new Map();
    filtrados.forEach(p => {
      const clave = p.contact_phone || `conv-${p.conversation_id}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          nombre: p.contact_name || 'Sin nombre',
          telefono: p.contact_phone || null,
          conversationId: p.conversation_id,
          pedidos: [],
          actualizado: p.updated_at
        });
      }
      const grupo = mapa.get(clave);
      grupo.pedidos.push(p);
      if (p.updated_at > grupo.actualizado) grupo.actualizado = p.updated_at;
    });

    return Array.from(mapa.values());
  }, [pedidos, busqueda]);

  const confirmarPago = async (pedido) => {
    const entregable = pedido.product_entregable;

    const texto = entregable
      ? `Vas a confirmar el pago de ${pedido.contact_name || pedido.contact_phone} por "${pedido.product_name}".\n\n` +
        `Al confirmar se le manda el enlace de descarga automáticamente.\n\n` +
        `Hacelo solo si ya viste la transferencia en el extracto del banco. El comprobante que mandó no alcanza: una captura se edita o se reenvía.`
      : `Vas a confirmar el pago de ${pedido.contact_name || pedido.contact_phone}, pero el producto "${pedido.product_name || 'sin producto'}" no tiene enlace de entrega cargado.\n\n` +
        `El pago se va a registrar, pero el material NO se le va a mandar: vas a tener que hacerlo a mano o cargar el enlace en Productos.`;

    if (!window.confirm(texto)) return;

    setTrabajando(pedido.id);
    try {
      const res = await ordersService.cambiarEstado(token, pedido.id, 'pagado');
      setAvisos(prev => ({ ...prev, [pedido.id]: res.entrega || null }));
      await cargar();
    } catch (err) {
      setAvisos(prev => ({ ...prev, [pedido.id]: { enviado: false, motivo: 'error', detalle: err.message } }));
    } finally {
      setTrabajando(null);
    }
  };

  const cambiar = async (pedido, nuevoEstado) => {
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

  const textoAviso = (aviso) => {
    if (!aviso) return null;
    if (aviso.enviado) return { ok: true, texto: 'Enlace enviado al cliente. El pedido quedó entregado.' };

    const motivos = {
      sin_enlace: 'El pago quedó registrado, pero el producto no tiene enlace de entrega. Cargalo en Productos y mandáselo a mano.',
      sin_token: 'El pago quedó registrado, pero el canal no tiene token de Meta, así que el enlace no salió.',
      sin_canal: 'El pago quedó registrado, pero el canal de este chat ya no existe.',
      meta_rechazo: 'El pago quedó registrado, pero Meta rechazó el envío. Podés reintentarlo desde el chat.',
      sin_conversacion: 'El pago quedó registrado, pero no se encontró la conversación.'
    };

    return {
      ok: false,
      texto: (motivos[aviso.motivo] || 'El pago quedó registrado, pero el enlace no salió.') +
        (aviso.detalle ? ` (${aviso.detalle})` : '')
    };
  };

  const btn = (fondo, borde, color) => ({
    fontSize: '.78rem',
    padding: '6px 11px',
    borderRadius: '6px',
    border: `1px solid ${borde}`,
    background: fondo,
    color,
    fontWeight: 600,
    cursor: 'pointer'
  });

  return (
    <div className="admin-page">
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 20px 60px' }}>
        <header style={{ marginBottom: '22px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.6rem' }}>Pedidos</h2>
          <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '.92rem' }}>
            Quién pagó y quién no, agrupado por cliente. Al confirmar un pago, el enlace
            de descarga se le manda solo.
          </p>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
                <div style={{ fontSize: '1.55rem', fontWeight: 700, color: cfg.color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
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

        {clientes.length === 0 && !cargando && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: 'var(--text-soft)',
            border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px',
            background: 'var(--bg-card, #fff)'
          }}>
            No hay pedidos con este filtro.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {clientes.map(cliente => (
            <article
              key={cliente.clave}
              style={{
                border: '1px solid var(--border-gold, #e2e2e2)',
                borderRadius: '10px',
                background: 'var(--bg-card, #fff)',
                overflow: 'hidden'
              }}
            >
              <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '12px', flexWrap: 'wrap',
                padding: '13px 16px',
                background: 'var(--bg-soft, #fafafa)',
                borderBottom: '1px solid var(--border-gold, #eee)'
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{cliente.nombre}</div>
                  <div style={{ color: 'var(--text-soft)', fontSize: '.8rem', fontVariantNumeric: 'tabular-nums' }}>
                    {cliente.telefono || '—'} · {cliente.pedidos.length === 1 ? '1 pedido' : `${cliente.pedidos.length} pedidos`} · {formatearFecha(cliente.actualizado)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-card-action"
                  style={{ fontSize: '.78rem', padding: '6px 12px' }}
                  onClick={() => navigate(`/inbox?conversation=${cliente.conversationId}`)}
                >
                  Abrir chat
                </button>
              </header>

              <div>
                {cliente.pedidos.map((p, i) => {
                  const aviso = textoAviso(avisos[p.id]);
                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: '12px 16px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--border-gold, #f0f0f0)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                          <div style={{ fontSize: '.9rem' }}>
                            {p.product_name || <span style={{ color: 'var(--text-soft)' }}>Producto sin definir</span>}
                          </div>
                          <div style={{ color: 'var(--text-soft)', fontSize: '.8rem', fontVariantNumeric: 'tabular-nums' }}>
                            {p.amount ? productsService.formatearPrecio(p.amount, p.currency) : 'Sin monto'}
                          </div>
                        </div>

                        <OrderBadge status={p.status} />

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(p.status === 'comprobante_recibido' || p.status === 'interesado' || p.status === 'rechazado') && (
                            <button
                              type="button"
                              disabled={trabajando === p.id}
                              onClick={() => confirmarPago(p)}
                              style={btn('rgba(16,185,129,.16)', '#04785733', '#047857')}
                            >
                              {trabajando === p.id ? 'Enviando…' : 'Confirmar pago y entregar'}
                            </button>
                          )}

                          {p.status === 'pagado' && (
                            <button
                              type="button"
                              disabled={trabajando === p.id}
                              onClick={() => confirmarPago(p)}
                              style={btn('rgba(16,185,129,.16)', '#04785733', '#047857')}
                            >
                              {trabajando === p.id ? 'Enviando…' : 'Reintentar entrega'}
                            </button>
                          )}

                          {p.status === 'comprobante_recibido' && (
                            <button
                              type="button"
                              disabled={trabajando === p.id}
                              onClick={() => cambiar(p, 'rechazado')}
                              style={btn('rgba(239,68,68,.12)', '#b91c1c33', '#b91c1c')}
                            >
                              Rechazar
                            </button>
                          )}
                        </div>
                      </div>

                      {p.product_id && !p.product_entregable && (
                        <p style={{
                          margin: '8px 0 0', fontSize: '.8rem', color: '#b45309',
                          background: 'rgba(245,158,11,.12)', padding: '7px 10px', borderRadius: '6px'
                        }}>
                          Este producto no tiene enlace de entrega cargado, así que al confirmar
                          el pago no se le va a mandar nada. Cargalo en Productos.
                        </p>
                      )}

                      {aviso && (
                        <p style={{
                          margin: '8px 0 0', fontSize: '.8rem',
                          color: aviso.ok ? '#065f46' : '#b45309',
                          background: aviso.ok ? 'rgba(5,150,105,.12)' : 'rgba(245,158,11,.12)',
                          padding: '7px 10px', borderRadius: '6px'
                        }}>
                          {aviso.texto}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>

        <p style={{ marginTop: '16px', fontSize: '.82rem', color: 'var(--text-soft)' }}>
          El bot puede marcar un pedido como <strong>Verificar</strong> cuando llega un comprobante,
          pero no puede confirmarlo como pagado: eso lo hace una persona después de ver la
          transferencia en el banco. El backend rechaza esa transición si viene del bot.
        </p>
      </main>
    </div>
  );
}

export default PedidosPage;
