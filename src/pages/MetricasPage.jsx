import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analytics.service';
import { IconoDeCanal, IconoVenta, IconoMensajes } from '../components/Icons';

export function MetricasPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [periodo, setPeriodo] = useState('7d');
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await analyticsService.getDashboard(token, { periodo });
      setData(res);
    } catch (err) {
      setError(err.message || 'Error al cargar métricas');
    } finally {
      setCargando(false);
    }
  }, [token, periodo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const periodoLabels = {
    hoy: 'Hoy',
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    todo: 'Histórico Completo'
  };

  return (
    <div className="admin-page">
      <main style={{ maxWidth: '1150px', margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Cabecera y Selector de Período */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '14px', marginBottom: '24px'
        }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.65rem', fontWeight: 700 }}>
              Control de Leads y Ventas
            </h2>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '.92rem' }}>
              Monitoreo en tiempo real: ventas del día, productos más y menos vendidos y productividad de asesores.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['hoy', '7d', '30d', 'todo'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                style={{
                  fontSize: '.82rem',
                  fontWeight: 600,
                  padding: '7px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  border: periodo === p
                    ? '1px solid var(--wa-teal, #047857)'
                    : '1px solid var(--border-gold, #e2e2e2)',
                  background: periodo === p
                    ? 'rgba(16,185,129,.16)'
                    : 'var(--bg-card, #fff)',
                  color: periodo === p ? 'var(--wa-teal-dark, #047857)' : 'inherit'
                }}
              >
                {periodoLabels[p]}
              </button>
            ))}

            <button
              type="button"
              className="btn-card-action"
              onClick={cargar}
              disabled={cargando}
              style={{ fontSize: '.82rem', padding: '7px 12px' }}
            >
              {cargando ? 'Actualizando…' : '🔄 Actualizar'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,.12)',
            color: '#b91c1c', marginBottom: '20px', fontSize: '.9rem'
          }}>
            {error}
          </div>
        )}

        {cargando && !data && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-soft)' }}>
            <p style={{ fontSize: '1.1rem' }}>Cargando métricas y análisis de leads…</p>
          </div>
        )}

        {data && (
          <>
            {/* KPI Cards Superiores */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '14px',
              marginBottom: '24px'
            }}>
              {/* Tarjeta 1: Ventas de Hoy */}
              <div style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid #10b98155',
                borderRadius: '12px',
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(16,185,129,.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '.8rem', fontWeight: 600, color: '#047857' }}>
                    ⚡ VENTAS DE HOY
                  </span>
                  <span style={{ fontSize: '.74rem', background: 'rgba(16,185,129,.16)', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Paraguay
                  </span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                  {analyticsService.formatearMonto(data.hoy.monto_hoy)}
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-soft)', marginTop: '6px' }}>
                  <strong>{data.hoy.ventas_hoy}</strong> {data.hoy.ventas_hoy === 1 ? 'pedido cobrado' : 'pedidos cobrados'} hoy
                </div>
              </div>

              {/* Tarjeta 2: Nuevos Leads de Hoy */}
              <div style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-gold, #e2e2e2)',
                borderRadius: '12px',
                padding: '18px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-soft)' }}>
                    🎯 NUEVOS LEADS HOY
                  </span>
                  <span style={{ fontSize: '1.1rem' }}>💬</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                  {data.hoy.leads_hoy}
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-soft)', marginTop: '6px' }}>
                  {data.hoy.conversaciones_hoy} chats activos hoy · Conv: {data.hoy.tasa_conversion_hoy}%
                </div>
              </div>

              {/* Tarjeta 3: Facturación del Período */}
              <div style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-gold, #e2e2e2)',
                borderRadius: '12px',
                padding: '18px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-soft)' }}>
                    💰 FACTURADO ({periodoLabels[periodo]?.toUpperCase()})
                  </span>
                  <IconoVenta size={16} />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                  {analyticsService.formatearMonto(data.periodo.total_ingresos)}
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-soft)', marginTop: '6px' }}>
                  <strong>{data.periodo.total_ventas}</strong> ventas sobre <strong>{data.periodo.total_leads}</strong> leads
                </div>
              </div>

              {/* Tarjeta 4: Conversión Global */}
              <div style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-gold, #e2e2e2)',
                borderRadius: '12px',
                padding: '18px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-soft)' }}>
                    📈 TASA DE CONVERSIÓN ({periodoLabels[periodo]?.toUpperCase()})
                  </span>
                  <span style={{ fontSize: '1.1rem' }}>🏆</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                  {data.periodo.tasa_conversion}%
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-soft)', marginTop: '6px' }}>
                  {data.periodo.total_ventas} compras de {data.periodo.total_leads} personas interesadas
                </div>
              </div>
            </div>

            {/* Fila de Destacados: Cuál vende más y cuál vende menos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '14px',
              marginBottom: '26px'
            }}>
              {/* Más Vendido */}
              <div style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid #10b98166',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  fontSize: '2rem', background: 'rgba(16,185,129,.14)',
                  width: '52px', height: '52px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  ⭐
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.76rem', fontWeight: 700, color: '#047857', letterSpacing: '.05em' }}>
                    EL QUE MÁS VENDE (TOP 1)
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '2px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {data.destacados.mas_vendido?.nombre || 'Sin ventas aún'}
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-soft)' }}>
                    {data.destacados.mas_vendido
                      ? `${data.destacados.mas_vendido.ventas} ventas · ${analyticsService.formatearMonto(data.destacados.mas_vendido.ingresos)} recaudados`
                      : 'Cargá pedidos para ver el ranking'}
                  </div>
                </div>
              </div>

              {/* Menos Vendido */}
              <div style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-gold, #e2e2e2)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  fontSize: '1.8rem', background: 'rgba(239,68,68,.12)',
                  width: '52px', height: '52px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  📉
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.76rem', fontWeight: 700, color: '#b91c1c', letterSpacing: '.05em' }}>
                    EL QUE MENOS VENDE
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '2px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {data.destacados.menos_vendido?.nombre || 'No hay suficientes productos'}
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-soft)' }}>
                    {data.destacados.menos_vendido
                      ? `${data.destacados.menos_vendido.ventas} ventas · ${analyticsService.formatearMonto(data.destacados.menos_vendido.ingresos)}`
                      : 'Requiere al menos 2 productos con actividad'}
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: Ranking y Rendimiento por Producto */}
            <section style={{
              background: 'var(--bg-card, #fff)',
              border: '1px solid var(--border-gold, #e2e2e2)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '26px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.18rem', fontWeight: 700 }}>
                    📦 Rendimiento por Producto ({periodoLabels[periodo]})
                  </h3>
                  <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text-soft)' }}>
                    Control de leads por producto, compras cerradas y porcentaje de conversión.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-card-action"
                  onClick={() => navigate('/productos')}
                  style={{ fontSize: '.8rem', padding: '6px 12px' }}
                >
                  Gestionar Catálogo →
                </button>
              </div>

              {data.productos.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-soft)' }}>
                  No se registraron pedidos en este período.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.86rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-gold, #eee)', textAlign: 'left', color: 'var(--text-soft)', fontSize: '.76rem' }}>
                        <th style={{ padding: '10px 12px' }}># RANKING</th>
                        <th style={{ padding: '10px 12px' }}>PRODUCTO</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>LEADS TOTALES</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>VENTAS CERRADAS</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>CONVERSIÓN</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>INGRESOS TOTALES</th>
                        <th style={{ padding: '10px 12px' }}>ESTADO DE LEADS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.productos.map((prod, idx) => {
                        const esTop = idx === 0 && prod.total_ventas > 0;
                        const esUltimo = idx === data.productos.length - 1 && data.productos.length > 1;

                        return (
                          <tr
                            key={prod.product_id}
                            style={{
                              borderBottom: '1px solid var(--border-gold, #f3f3f3)',
                              background: esTop ? 'rgba(16,185,129,.03)' : 'transparent'
                            }}
                          >
                            <td style={{ padding: '12px', fontWeight: 700, color: esTop ? '#047857' : 'inherit' }}>
                              {esTop ? '⭐ #1' : `#${idx + 1}`}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: 600 }}>{prod.product_name}</div>
                              <div style={{ fontSize: '.74rem', color: 'var(--text-soft)' }}>
                                Precio: {analyticsService.formatearMonto(prod.price, prod.currency)}
                              </div>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                              {prod.total_leads}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 9px', borderRadius: '12px',
                                background: prod.total_ventas > 0 ? 'rgba(16,185,129,.16)' : 'rgba(107,114,128,.1)',
                                color: prod.total_ventas > 0 ? '#047857' : 'inherit',
                                fontWeight: 700
                              }}>
                                {prod.total_ventas}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 600 }}>{prod.tasa_conversion}%</div>
                              {/* Barra de progreso de conversión */}
                              <div style={{
                                width: '60px', height: '5px', background: '#e5e7eb',
                                borderRadius: '4px', margin: '4px auto 0', overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${Math.min(prod.tasa_conversion, 100)}%`,
                                  height: '100%',
                                  background: prod.tasa_conversion > 30 ? '#10b981' : (prod.tasa_conversion > 10 ? '#3b82f6' : '#f59e0b')
                                }} />
                              </div>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {analyticsService.formatearMonto(prod.total_ingresos)}
                              <div style={{ fontSize: '.72rem', color: 'var(--text-soft)', fontWeight: 400 }}>
                                {prod.participacion_ingresos}% del total
                              </div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '6px', fontSize: '.74rem', flexWrap: 'wrap' }}>
                                {prod.por_verificar > 0 && (
                                  <span style={{ padding: '2px 6px', borderRadius: '6px', background: 'rgba(245,158,11,.15)', color: '#b45309' }}>
                                    🟡 {prod.por_verificar} por verificar
                                  </span>
                                )}
                                {prod.interesados > 0 && (
                                  <span style={{ padding: '2px 6px', borderRadius: '6px', background: 'rgba(107,114,128,.12)', color: '#6b7280' }}>
                                    ⚪ {prod.interesados} interesados
                                  </span>
                                )}
                                {prod.rechazados > 0 && (
                                  <span style={{ padding: '2px 6px', borderRadius: '6px', background: 'rgba(239,68,68,.12)', color: '#b91c1c' }}>
                                    🔴 {prod.rechazados} rechazados
                                  </span>
                                )}
                                {prod.por_verificar === 0 && prod.interesados === 0 && prod.rechazados === 0 && (
                                  <span style={{ color: 'var(--text-soft)' }}>Todo cobrado</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* SECCIÓN 2: Productividad de Asesores (Quién tuvo más conversaciones) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
              gap: '18px',
              marginBottom: '26px'
            }}>
              {/* Asesores */}
              <section style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-gold, #e2e2e2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ marginBottom: '14px' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.18rem', fontWeight: 700 }}>
                    👥 Asesores: ¿Quién tuvo más conversaciones?
                  </h3>
                  <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text-soft)' }}>
                    Desempeño de atención, volumen de chats y ventas confirmadas por cada operador.
                  </p>
                </div>

                {data.asesores.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)' }}>
                    No hay asesores asignados a conversaciones en este período.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.asesores.map((asesor, i) => (
                      <div
                        key={asesor.user_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-gold, #eee)',
                          background: i === 0 && asesor.conversaciones_asignadas > 0 ? 'rgba(59,130,246,.04)' : 'var(--bg-soft, #fafafa)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: i === 0 ? '#3b82f6' : 'var(--bg-card, #e2e2e2)',
                            color: i === 0 ? '#fff' : 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '.88rem'
                          }}>
                            {asesor.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                              {asesor.user_name}
                              {i === 0 && asesor.conversaciones_asignadas > 0 && (
                                <span style={{ marginLeft: '6px', fontSize: '.72rem', color: '#2563eb', fontWeight: 700 }}>
                                  👑 MÁS CHATS
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '.76rem', color: 'var(--text-soft)' }}>
                              {asesor.user_email} · Rol: {asesor.user_role}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '.94rem' }}>
                            {asesor.conversaciones_asignadas} chats
                          </div>
                          <div style={{ fontSize: '.76rem', color: '#047857', fontWeight: 600 }}>
                            {asesor.pedidos_confirmados} ventas · {analyticsService.formatearMonto(asesor.monto_confirmado)}
                          </div>
                        </div>
                      </div>
                    ))}

                    {data.conversaciones_sin_asignar > 0 && (
                      <div style={{
                        padding: '10px 14px', borderRadius: '8px',
                        background: 'rgba(245,158,11,.1)', color: '#b45309', fontSize: '.8rem'
                      }}>
                        ℹ️ Hay <strong>{data.conversaciones_sin_asignar}</strong> conversaciones gestionadas automáticamente por el bot o sin asesor asignado.
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Canales de Entrada */}
              <section style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-gold, #e2e2e2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ marginBottom: '14px' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.18rem', fontWeight: 700 }}>
                    📱 Canales y Origen de Leads
                  </h3>
                  <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text-soft)' }}>
                    Por qué canal ingresan más consultas y de dónde provienen las ventas.
                  </p>
                </div>

                {data.canales.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)' }}>
                    No hay canales activos configurados.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.canales.map((canal) => (
                      <div
                        key={canal.channel_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-gold, #eee)',
                          background: 'var(--bg-soft, #fafafa)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <IconoDeCanal platform={canal.platform} size={24} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                              {canal.channel_name}
                            </div>
                            <div style={{ fontSize: '.76rem', color: 'var(--text-soft)', textTransform: 'capitalize' }}>
                              {canal.platform}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '.92rem' }}>
                            {canal.total_conversaciones} conversaciones
                          </div>
                          <div style={{ fontSize: '.76rem', color: '#047857', fontWeight: 600 }}>
                            {canal.total_ventas} ventas · {analyticsService.formatearMonto(canal.total_ingresos)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* SECCIÓN 3: Tendencia Diaria de Ventas */}
            {data.tendencia && data.tendencia.length > 0 && (
              <section style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-gold, #e2e2e2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.18rem', fontWeight: 700 }}>
                  📅 Tendencia Diaria de Ventas y Nuevos Leads
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '.84rem', color: 'var(--text-soft)' }}>
                  Evolución día por día para identificar picos de venta.
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${data.tendencia.length}, 1fr)`,
                  gap: '8px',
                  alignItems: 'end',
                  height: '140px',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-gold, #eee)'
                }}>
                  {(() => {
                    const maxVentas = Math.max(...data.tendencia.map(t => t.ventas), 1);
                    return data.tendencia.map(t => {
                      const alturaPct = Math.max((t.ventas / maxVentas) * 100, 8);
                      const esHoy = t.fecha === (new Date().toISOString().slice(0, 10));

                      return (
                        <div key={t.fecha} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '.72rem', fontWeight: 700, color: t.ventas > 0 ? '#047857' : 'var(--text-soft)', marginBottom: '4px' }}>
                            {t.ventas}
                          </span>
                          <div style={{
                            width: '100%', maxWidth: '38px',
                            height: `${alturaPct}%`,
                            background: esHoy ? '#10b981' : (t.ventas > 0 ? 'rgba(16,185,129,.5)' : '#e5e7eb'),
                            borderRadius: '4px 4px 0 0',
                            transition: 'height .2s'
                          }} />
                        </div>
                      );
                    });
                  })()}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${data.tendencia.length}, 1fr)`,
                  gap: '8px',
                  textAlign: 'center',
                  marginTop: '8px',
                  fontSize: '.72rem',
                  color: 'var(--text-soft)'
                }}>
                  {data.tendencia.map(t => (
                    <div key={t.fecha} style={{ fontWeight: 600 }}>
                      {t.etiqueta}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default MetricasPage;
