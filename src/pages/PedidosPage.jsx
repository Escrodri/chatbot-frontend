import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersService, ESTADOS, ORDEN_ESTADOS, ETAPAS } from '../services/orders.service';
import { productsService } from '../services/products.service';
import { analyticsService } from '../services/analytics.service';
import { OrderBadge } from '../components/inbox/OrderBadge';
import { RevisionAutomatica } from '../components/pedidos/RevisionAutomatica';

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
  const [ventasHoy, setVentasHoy] = useState(null);
  const [embudo, setEmbudo] = useState(null);

  // Resultado de la última entrega, por pedido. Confirmar un pago dispara el
  // envío del enlace, y hay que decir si salió o no: antes esto era mudo.
  const [avisos, setAvisos] = useState({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // 'auto' no es un estado del pedido sino una marca, así que se pide todo
      // y se filtra acá. Son pocos por noche: no justifica un endpoint propio.
      const statusPedido = (filtro === 'todos' || filtro === 'auto') ? null : filtro;

      const [lista, sum, dashboard, emb] = await Promise.all([
        ordersService.list(token, { status: statusPedido }),
        ordersService.resumen(token),
        analyticsService.getDashboard(token, { periodo: 'hoy' }).catch(() => null),
        // Si el embudo falla, el tablero tiene que seguir funcionando: es
        // información para decidir, no para trabajar.
        ordersService.embudo(token, 30).catch(() => null)
      ]);
      setPedidos(Array.isArray(lista) ? lista : []);
      setResumen(Array.isArray(sum) ? sum : []);
      if (dashboard?.hoy) setVentasHoy(dashboard.hoy);
      setEmbudo(emb);
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

    const porMarca = filtro === 'auto'
      ? pedidos.filter(p => p.auto_aprobado)
      : pedidos;

    const filtrados = !q ? porMarca : porMarca.filter(p =>
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
  }, [pedidos, busqueda, filtro]);

  // Cuántos cobró el sistema solo mientras no había nadie. Se cuenta sobre lo
  // que está cargado, así que solo es exacto mirando "Ver todos" o el propio
  // filtro; alcanza para que el número llame la atención cuando hay algo.
  const autoAprobados = useMemo(
    () => pedidos.filter(p => p.auto_aprobado).length,
    [pedidos]
  );

  const confirmarPago = async (pedido) => {
    const entregable = pedido.product_entregable;

    if (!entregable) {
      alert(
        `El producto "${pedido.product_name || 'sin nombre'}" no tiene enlace de entrega cargado.\n\n` +
        `Cárgalo primero en la sección de Productos antes de confirmar el pago y la entrega.`
      );
      return;
    }

    const texto =
      `Vas a confirmar el pago de ${pedido.contact_name || pedido.contact_phone} por "${pedido.product_name}".\n\n` +
      `Al confirmar se le enviará el enlace de descarga automáticamente por WhatsApp.\n\n` +
      `Hacelo solo si ya viste la transferencia en el extracto del banco. El comprobante que mandó no alcanza: una captura se edita o se reenvía.`;

    if (!window.confirm(texto)) return;

    setTrabajando(pedido.id);
    try {
      const res = await ordersService.cambiarEstado(token, pedido.id, 'pagado', { notify: true });
      setAvisos(prev => ({ ...prev, [pedido.id]: res.entrega || null }));
      await cargar();
    } catch (err) {
      alert('No se pudo confirmar: ' + err.message);
      setAvisos(prev => ({ ...prev, [pedido.id]: { enviado: false, motivo: 'error', detalle: err.message } }));
    } finally {
      setTrabajando(null);
    }
  };

  const rechazarConAviso = async (pedido) => {
    const quien = pedido.contact_name || pedido.contact_phone || 'este cliente';
    if (!window.confirm(`¿Rechazar comprobante y avisarle a ${quien} por WhatsApp que la transferencia no figura aún?`)) return;

    setTrabajando(pedido.id);
    try {
      const res = await ordersService.cambiarEstado(token, pedido.id, 'rechazado', { notify: true });
      setAvisos(prev => ({ ...prev, [pedido.id]: res.entrega || null }));
      await cargar();
    } catch (err) {
      alert('No se pudo rechazar: ' + err.message);
    } finally {
      setTrabajando(null);
    }
  };

  const cambiarEstadoManual = async (pedido, nuevoEstado) => {
    if (!nuevoEstado || nuevoEstado === pedido.status) return;

    setTrabajando(pedido.id);
    try {
      const res = await ordersService.cambiarEstado(token, pedido.id, nuevoEstado, { notify: false });
      setAvisos(prev => ({ ...prev, [pedido.id]: res.entrega || null }));
      await cargar();
    } catch (err) {
      alert('No se pudo cambiar el estado: ' + err.message);
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

  // El texto vive en orders.service para que este tablero y el panel del chat
  // digan exactamente lo mismo ante el mismo resultado.
  const textoAviso = (aviso) => (aviso === undefined ? null : ordersService.describirEntrega(aviso));

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
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '14px', marginBottom: '22px'
        }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.6rem' }}>Pedidos</h2>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '.92rem' }}>
              Quién pagó y quién no, agrupado por cliente. Al confirmar un pago, el enlace
              de descarga se le manda solo.
            </p>
          </div>

          {ventasHoy && (
            <div
              onClick={() => navigate('/metricas')}
              title="Ver análisis completo de ventas, productos y leads"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #10b98155',
                background: 'rgba(16,185,129,.08)',
                transition: 'all .15s'
              }}
            >
              <div>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#047857', letterSpacing: '.04em' }}>
                  ⚡ VENTAS DE HOY
                </div>
                <div style={{ fontSize: '1.18rem', fontWeight: 800, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                  {analyticsService.formatearMonto(ventasHoy.monto_hoy)}
                </div>
              </div>
              <span style={{ fontSize: '.78rem', color: '#047857', fontWeight: 700 }}>
                Ver métricas →
              </span>
            </div>
          )}
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

        {/* El recorrido completo, de los últimos 30 días.
            Los cinco estados de arriba dicen qué hay para hacer hoy. Esto dice
            otra cosa: en qué escalón se cae la gente. Son preguntas distintas y
            la segunda es la que decide dónde tocar el guion y qué anuncio
            conviene. */}
        {embudo?.general && Object.values(embudo.general).some(n => n > 0) && (
          <section style={{
            marginBottom: '22px', padding: '16px 18px', borderRadius: '10px',
            border: '1px solid var(--border-gold, #e2e2e2)', background: 'var(--bg-card, #fff)'
          }}>
            <div style={{
              fontSize: '.74rem', fontWeight: 700, letterSpacing: '.04em',
              color: 'var(--text-soft)', marginBottom: '12px'
            }}>
              EL RECORRIDO — ÚLTIMOS 30 DÍAS
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'stretch' }}>
              {ETAPAS.map(({ clave, etiqueta }) => {
                const cantidad = embudo.general[clave] || 0;
                const base = embudo.general.entro || 0;
                const pct = base > 0 ? Math.round((cantidad / base) * 100) : 0;
                const esVenta = clave === 'pago' || clave === 'recibio_material';

                return (
                  <div key={clave} style={{
                    flex: '1 1 110px', minWidth: '104px', padding: '9px 10px', borderRadius: '8px',
                    background: esVenta ? 'rgba(16,185,129,.10)' : 'var(--bg-soft, #f7f7f7)',
                    border: `1px solid ${esVenta ? '#04785733' : 'var(--border-gold, #e8e8e8)'}`
                  }}>
                    <div style={{
                      fontSize: '1.15rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      color: esVenta ? '#047857' : 'inherit', lineHeight: 1.1
                    }}>
                      {cantidad}
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-soft)', lineHeight: 1.3, marginTop: '2px' }}>
                      {etiqueta}
                    </div>
                    {base > 0 && (
                      <div style={{ fontSize: '.68rem', color: 'var(--text-soft)', marginTop: '3px', opacity: .8 }}>
                        {pct}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Por anuncio. Es lo único que separa "este anuncio trae gente"
                de "este anuncio trae gente que paga", y sin eso el costo por
                venta real no se puede calcular. */}
            {embudo.anuncios && Object.keys(embudo.anuncios).length > 0 && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border-gold, #e2e2e2)' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-soft)', marginBottom: '8px' }}>
                  Por anuncio
                </div>
                <div style={{ display: 'grid', gap: '4px' }}>
                  {Object.entries(embudo.anuncios)
                    .sort((a, b) => (b[1].entro || 0) - (a[1].entro || 0))
                    .slice(0, 6)
                    .map(([anuncio, datos]) => {
                      const entraron = datos.entro || 0;
                      const compraron = datos.pago || 0;
                      const tasa = entraron > 0 ? Math.round((compraron / entraron) * 100) : 0;
                      return (
                        <div key={anuncio} style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          fontSize: '.78rem', padding: '5px 0'
                        }}>
                          <span style={{
                            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontFamily: anuncio === 'sin_anuncio' ? 'inherit' : 'ui-monospace, monospace'
                          }}>
                            {anuncio === 'sin_anuncio' ? 'Sin anuncio (escribieron directo)' : anuncio}
                          </span>
                          <span style={{ color: 'var(--text-soft)', fontVariantNumeric: 'tabular-nums' }}>
                            {entraron} → {compraron}
                          </span>
                          <span style={{
                            fontWeight: 700, minWidth: '42px', textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            color: tasa > 0 ? '#047857' : 'var(--text-soft)'
                          }}>
                            {tasa}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Va antes de los filtros, y no escondido en Configuración, porque la
            pregunta "¿quién está revisando los comprobantes ahora?" se hace
            mirando esta misma pantalla. */}
        <RevisionAutomatica />

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={`filter-pill ${filtro === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            Ver todos
          </button>

          {/* Los que el sistema cobró y entregó de madrugada, sin que nadie
              mirara el banco. Tienen que ser fáciles de encontrar a la mañana:
              es la única revisión que queda entre un comprobante falso y el
              material regalado. */}
          <button
            type="button"
            onClick={() => setFiltro('auto')}
            title="Pedidos que el sistema cobró y entregó solo, sin revisión humana"
            style={{
              padding: '8px 14px', borderRadius: '999px', cursor: 'pointer',
              fontSize: '.82rem', fontWeight: 600,
              border: `1px solid ${filtro === 'auto' ? '#b45309' : '#b4530944'}`,
              background: filtro === 'auto' ? 'rgba(245,158,11,.18)' : 'transparent',
              color: '#b45309'
            }}
          >
            🌙 Aprobados solos{autoAprobados > 0 ? ` (${autoAprobados})` : ''}
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

                        {/* Selector de estado interactivo: permite cambiar libremente a cualquiera de los 5 estados */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            value={p.status}
                            disabled={trabajando === p.id}
                            onChange={(e) => cambiarEstadoManual(p, e.target.value)}
                            title="Cambiar estado del pedido libremente"
                            style={{
                              fontSize: '.82rem',
                              fontWeight: 600,
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: `1px solid ${ESTADOS[p.status]?.color || '#ddd'}66`,
                              background: ESTADOS[p.status]?.fondo || '#fff',
                              color: ESTADOS[p.status]?.color || '#333',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="comprobante_recibido">🟡 Verificar (comprobante)</option>
                            <option value="interesado">⚪ Interesado</option>
                            <option value="pagado">🟢 Pagado</option>
                            <option value="entregado">🟣 Entregado</option>
                            <option value="rechazado">🔴 Rechazado</option>
                          </select>
                        </div>

                        {/* Aviso de que a este pedido no lo miró nadie. Va
                            pegado al estado y no escondido en un detalle,
                            porque es lo único que separa un comprobante falso
                            aprobado a las 3 de la mañana de una pérdida que
                            nadie va a notar nunca. */}
                        {p.auto_aprobado && (
                          <div style={{
                            fontSize: '.74rem', padding: '6px 9px', borderRadius: '7px',
                            background: 'rgba(245,158,11,.14)', color: '#b45309',
                            border: '1px solid #b4530933', lineHeight: 1.4
                          }}>
                            🌙 <strong>Lo aprobó el sistema</strong>, sin revisión humana.
                            {p.receipt_operacion && (
                              <> Operación <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{p.receipt_operacion}</strong>.</>
                            )}
                            {' '}Contrastalo contra el extracto del banco.
                          </div>
                        )}

                        {/* Cuántas veces se le insistió y con qué precio.
                            Importa al confirmar: si el sistema le ofreció el
                            precio de recuperación, la transferencia va a venir
                            por ese monto y no por el de lista, y sin este
                            cartel parece un pago incompleto. */}
                        {Number(p.recuperacion_nivel) > 0 && (
                          <div style={{
                            fontSize: '.74rem', padding: '6px 9px', borderRadius: '7px',
                            background: 'rgba(99,102,241,.12)', color: '#4338ca',
                            border: '1px solid #4338ca26', lineHeight: 1.4
                          }}>
                            🔁 <strong>
                              {Number(p.recuperacion_nivel) === 1
                                ? 'Se le mandó 1 recordatorio'
                                : `Se le mandaron ${p.recuperacion_nivel} seguimientos`}
                            </strong>
                            {Number(p.recuperacion_nivel) >= 2 && ', con el precio de recuperación'}.
                            {p.recuperacion_at && (
                              <> Último: {new Date(p.recuperacion_at).toLocaleString('es-PY', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                              })}.</>
                            )}
                          </div>
                        )}

                        {/* Botones de acción contextuales */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.status !== 'entregado' && (
                            <button
                              type="button"
                              disabled={trabajando === p.id}
                              onClick={() => confirmarPago(p)}
                              style={btn('rgba(16,185,129,.16)', '#04785733', '#047857')}
                              title="Verificar banco y enviar enlace de descarga por WhatsApp"
                            >
                              {trabajando === p.id ? 'Enviando…' : (p.status === 'pagado' ? 'Reintentar entrega' : 'Confirmar pago y entregar')}
                            </button>
                          )}

                          {p.status === 'entregado' && p.product_entregable && (
                            <button
                              type="button"
                              disabled={trabajando === p.id}
                              onClick={() => confirmarPago(p)}
                              style={btn('rgba(16,185,129,.12)', '#04785733', '#047857')}
                              title="Reenviar el enlace de descarga por WhatsApp"
                            >
                              {trabajando === p.id ? 'Enviando…' : 'Reenviar enlace'}
                            </button>
                          )}

                          {(p.status === 'comprobante_recibido' || p.status === 'interesado') && (
                            <button
                              type="button"
                              disabled={trabajando === p.id}
                              onClick={() => rechazarConAviso(p)}
                              style={btn('rgba(239,68,68,.12)', '#b91c1c33', '#b91c1c')}
                              title="Avisar que no figura acreditado y pedir la captura de nuevo"
                            >
                              Rechazar
                            </button>
                          )}

                          {p.status === 'rechazado' && (
                            <button
                              type="button"
                              disabled={trabajando === p.id}
                              onClick={() => cambiarEstadoManual(p, 'comprobante_recibido')}
                              style={btn('rgba(245,158,11,.18)', '#b4530933', '#b45309')}
                              title="El cliente envió la captura de nuevo, volver a poner en Verificar"
                            >
                              Volver a Verificar
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

        <p style={{ marginTop: '16px', fontSize: '.82rem', color: 'var(--text-soft)', lineHeight: 1.55 }}>
          El bot marca un pedido como <strong>Verificar</strong> cuando llega un comprobante, y
          mientras haya alguien atendiendo ahí se queda: confirmarlo lo hace una persona después
          de ver la transferencia en el banco.
          <br />
          Cuando no hay nadie es distinto. De madrugada siempre, y de día cuando lo encendés
          arriba porque vas a salir, el sistema cobra y entrega solo —pero únicamente si el monto
          llega al precio, la cuenta es la nuestra y el número de operación no cobró otro pedido—.
          Hacer esperar ocho horas a alguien que ya pagó cuesta más que el riesgo de un
          comprobante falso en un material digital. Esos pedidos quedan marcados con 🌙 y conviene
          repasarlos contra el extracto.
        </p>
      </main>
    </div>
  );
}

export default PedidosPage;
