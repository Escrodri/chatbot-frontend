import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { visitasService } from '../../services/visitas.service';

/**
 * Monitor en tiempo real de Visitas y Atribución (Landing Plan 21).
 *
 * Visualiza qué anuncios y campañas están enviando visitas reales a la landing,
 * cuántas personas avanzan a comprar en Hotmart y si el código de seguimiento
 * (SCK) está pasando correctamente para atribuir las ventas.
 */

const PERIODOS = [
  { dias: 1, texto: 'Hoy' },
  { dias: 7, texto: '7 días' },
  { dias: 30, texto: '30 días' },
  { dias: 90, texto: '90 días' }
];

const PARAMETROS_META =
  'utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}' +
  '&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}&site={{site_source_name}}';

function pctTxt(val) {
  if (val === null || val === undefined) return '0%';
  return `${Number(val).toFixed(1).replace('.', ',')}%`;
}

function legible(texto) {
  try {
    return decodeURIComponent(String(texto || '').replace(/\+/g, ' '));
  } catch {
    return String(texto || '');
  }
}

function horaLegible(ts) {
  try {
    return new Date(ts).toLocaleString('es-PY', {
      timeZone: 'America/Asuncion',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return ts;
  }
}

function tiempoRelativo(ts) {
  if (!ts) return '';
  try {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
    if (diff < 15) return 'Ahora mismo';
    if (diff < 60) return `Hace ${diff}s`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `Hace ${mins}m`;
    const horas = Math.floor(mins / 60);
    if (horas < 24) return `Hace ${horas}h`;
    const dias = Math.floor(horas / 24);
    return `Hace ${dias}d`;
  } catch {
    return '';
  }
}

function formatoUbicacion(raw) {
  if (!raw) return '—';
  const l = String(raw).replace(/_/g, ' ');
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function extraerParamsFallback(urlStr) {
  if (!urlStr) return {};
  try {
    const q = urlStr.includes('?') ? urlStr.split('?')[1] : urlStr;
    const sp = new URLSearchParams(q);
    const out = {};
    for (const [k, v] of sp.entries()) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export function Visitas() {
  const { token, user } = useAuth();
  const esAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [dias, setDias] = useState(7);
  const [tabActiva, setTabActiva] = useState('recientes'); // 'recientes' | 'anuncios' | 'campanas' | 'ubicaciones' | 'diagnostico'
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'visita' | 'clic_comprar'
  const [busqueda, setBusqueda] = useState('');
  const [eventoExpandido, setEventoExpandido] = useState(null);

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [modalLimpiar, setModalLimpiar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const eliminarEventoIndividual = async (id, ts, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Descartar este registro de prueba?')) return;
    setEliminando(true);
    try {
      await visitasService.eliminar(id, ts, token);
      await cargar();
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    } finally {
      setEliminando(false);
    }
  };

  const ejecutarLimpieza = async (tipo) => {
    const txt = tipo === 'sin_utm'
      ? '¿Borrar todas las visitas de prueba que NO vinieron de anuncios?'
      : '¿Seguro que deseas REINICIAR TODO el historial de visitas a cero para arrancar en limpio?';
    if (!window.confirm(txt)) return;

    setEliminando(true);
    try {
      await visitasService.limpiar(tipo, token);
      setModalLimpiar(false);
      await cargar();
    } catch (err) {
      alert(err.message || 'Error al limpiar visitas');
    } finally {
      setEliminando(false);
    }
  };

  const cargar = useCallback(async () => {
    if (!esAdmin) return;
    setCargando(true);
    try {
      setError(null);
      const res = await visitasService.resumen(token, dias);
      setDatos(res);
      setUltimaActualizacion(new Date());
    } catch (e) {
      setError(e.message || 'Error al consultar las visitas');
    } finally {
      setCargando(false);
    }
  }, [token, dias, esAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Actualización automática en segundo plano cada 30 segundos
  useEffect(() => {
    if (!esAdmin) return undefined;
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, [cargar, esAdmin]);

  const copiarParametros = async () => {
    try {
      await navigator.clipboard.writeText(PARAMETROS_META);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // fallback
    }
  };

  const t = datos?.totales || { visitas: 0, clics: 0, tasaClic: 0 };
  const dg = datos?.diagnostico;
  const porDia = datos?.porDia || [];

  // Enriquecer y filtrar eventos recientes
  const eventosFiltrados = useMemo(() => {
    if (!datos?.recientes?.length) return [];
    return datos.recientes.filter((e) => {
      if (filtroTipo !== 'todos' && e.tipo !== filtroTipo) return false;
      if (!busqueda.trim()) return true;

      const q = busqueda.toLowerCase().trim();
      const p = extraerParamsFallback(e.url);
      const anuncio = (e.utm_content || p.utm_content || '').toLowerCase();
      const campana = (e.utm_campaign || p.utm_campaign || '').toLowerCase();
      const placement = (e.placement || p.placement || '').toLowerCase();
      const adId = (e.ad_id || p.ad_id || '').toLowerCase();
      const ref = (e.ref || '').toLowerCase();
      const sck = (e.destino_sck || e.sck || p.sck || '').toLowerCase();

      return (
        anuncio.includes(q) ||
        campana.includes(q) ||
        placement.includes(q) ||
        adId.includes(q) ||
        ref.includes(q) ||
        sck.includes(q) ||
        (e.url || '').toLowerCase().includes(q)
      );
    });
  }, [datos?.recientes, filtroTipo, busqueda]);

  if (!esAdmin) return null;

  // Cálculos de salud
  const pctAtribucion = dg?.conUtm?.pct ?? 0;
  const pctSck = dg?.clicsConSck?.pct ?? 0;

  // Máximo para barras del gráfico diario
  const maxVisitasDia = Math.max(1, ...porDia.map((d) => d.visitas || 0));

  return (
    <section
      style={{
        marginBottom: '26px',
        borderRadius: '16px',
        border: '1px solid var(--border, #e5e7eb)',
        background: 'var(--bg-panel, #ffffff)',
        boxShadow: 'var(--shadow-2, 0 4px 20px rgba(0,0,0,0.06))',
        overflow: 'hidden',
        fontFamily: 'inherit'
      }}
    >
      {/* ── BARRA SUPERIOR CON ESTADO EN VIVO ── */}
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border, #e5e7eb)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          background: 'linear-gradient(180deg, var(--bg-hover, #f9fafb) 0%, var(--bg-panel, #ffffff) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h5l3 7 4-14 3 7h5" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-strong, #111827)' }}>
                Rastro & Atribución de Visitas (Plan 21)
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  fontSize: '.72rem',
                  fontWeight: 700,
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 8px #10b981'
                  }}
                />
                En vivo
              </span>
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--text-soft, #6b7280)', marginTop: '3px' }}>
              Tráfico real en la landing, origen de anuncios Meta y clics con SCK hacia Hotmart.
            </div>
          </div>
        </div>

        {/* SELECTOR DE PERIODO Y BOTÓN ACTUALIZAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-app, #f3f4f6)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border, #e5e7eb)'
            }}
          >
            {PERIODOS.map((p) => {
              const activo = dias === p.dias;
              return (
                <button
                  key={p.dias}
                  type="button"
                  onClick={() => setDias(p.dias)}
                  style={{
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '.78rem',
                    fontWeight: activo ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: activo ? 'var(--bg-panel, #ffffff)' : 'transparent',
                    color: activo ? 'var(--text-strong, #111827)' : 'var(--text-soft, #6b7280)',
                    boxShadow: activo ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {p.texto}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={cargar}
            disabled={cargando}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '9px',
              border: '1px solid var(--border, #e5e7eb)',
              background: 'var(--bg-panel, #ffffff)',
              color: 'var(--text-strong, #111827)',
              fontSize: '.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: cargando ? 'spin 1s linear infinite' : 'none'
              }}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            {cargando ? 'Sincronizando…' : 'Actualizar'}
          </button>

          <button
            type="button"
            onClick={() => setModalLimpiar(true)}
            disabled={eliminando || cargando}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '9px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: '.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Borrar visitas de prueba para arrancar en limpio"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Limpiar Pruebas
          </button>
        </div>
      </div>

      {/* AVISOS DE BASE DE DATOS O ERROR */}
      {error && (
        <div
          style={{
            margin: '16px 22px 0',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {datos?.almacenamiento !== 'postgres' && (
        <div
          style={{
            margin: '16px 22px 0',
            padding: '11px 16px',
            borderRadius: '10px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          <span>
            <b>Modo Memoria Temporal:</b> La base de datos no está respondiendo; los datos se están conservando en memoria de forma segura y se guardarán en Postgres en cuanto se restablezca la conexión.
          </span>
        </div>
      )}

      {/* ── CUADRÍCULA DE MÉTRICAS PRINCIPALES (KPIS) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          padding: '20px 22px'
        }}
      >
        {/* KPI 1: VISITAS */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            background: 'var(--bg-app, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--text-soft, #64748b)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Visitas Totales
            </span>
            <span style={{ fontSize: '.74rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
              Landing
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-strong, #0f172a)', margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
            {t.visitas.toLocaleString()}
          </div>
          <div style={{ fontSize: '.74rem', color: 'var(--text-soft, #64748b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{pctTxt(dg?.conFbclid?.pct)} vienen de Meta (fbclid)</span>
          </div>
        </div>

        {/* KPI 2: CLICS EN COMPRAR */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            background: 'var(--bg-app, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--text-soft, #64748b)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Clics al Checkout
            </span>
            <span style={{ fontSize: '.74rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
              {pctTxt(t.tasaClic)}
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669', margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
            {t.clics.toLocaleString()}
          </div>
          <div style={{ fontSize: '.74rem', color: 'var(--text-soft, #64748b)' }}>
            Intención de compra hacia Hotmart
          </div>
        </div>

        {/* KPI 3: ATRIBUCIÓN META (UTM) */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            background: 'var(--bg-app, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--text-soft, #64748b)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Con Anuncio (UTM)
            </span>
            <span
              style={{
                fontSize: '.74rem',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 700,
                background: pctAtribucion >= 70 ? '#dcfce7' : pctAtribucion > 0 ? '#fef3c7' : '#fee2e2',
                color: pctAtribucion >= 70 ? '#15803d' : pctAtribucion > 0 ? '#b45309' : '#b91c1c'
              }}
            >
              {pctTxt(pctAtribucion)}
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-strong, #0f172a)', margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
            {dg?.conAnuncio?.n ?? 0}
          </div>
          <div style={{ fontSize: '.74rem', color: 'var(--text-soft, #64748b)' }}>
            Traen nombre de anuncio y campaña
          </div>
        </div>

        {/* KPI 4: EFECTIVIDAD SCK HOTMART */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            background: 'var(--bg-app, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--text-soft, #64748b)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Rastro a Hotmart (SCK)
            </span>
            <span
              style={{
                fontSize: '.74rem',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 700,
                background: pctSck >= 80 ? '#dcfce7' : pctSck > 0 ? '#fef3c7' : '#fee2e2',
                color: pctSck >= 80 ? '#15803d' : pctSck > 0 ? '#b45309' : '#b91c1c'
              }}
            >
              {pctTxt(pctSck)}
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#4f46e5', margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
            {dg?.clicsConSck?.n ?? 0}
          </div>
          <div style={{ fontSize: '.74rem', color: 'var(--text-soft, #64748b)' }}>
            Hotmart recibe el ID para atribuir ventas
          </div>
        </div>
      </div>

      {/* ── GRÁFICO DIARIO DE VISITAS Y CLICS ── */}
      {porDia.length > 1 && (
        <div
          style={{
            margin: '0 22px 20px',
            padding: '16px 18px',
            borderRadius: '12px',
            background: 'var(--bg-app, #f9fafb)',
            border: '1px solid var(--border, #e5e7eb)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text-strong, #111827)' }}>
              Evolución diaria de Visitas vs Clics en Comprar
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '.74rem', color: 'var(--text-soft, #6b7280)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#38bdf8' }} /> Visitas
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} /> Clics en comprar
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              height: '90px',
              paddingTop: '10px',
              borderBottom: '1px solid var(--border, #e5e7eb)'
            }}
          >
            {porDia.map((d) => {
              const hVisitas = Math.max(4, Math.round(((d.visitas || 0) / maxVisitasDia) * 75));
              const hClics = Math.max(2, Math.round(((d.clics || 0) / maxVisitasDia) * 75));
              const diaLabel = d.dia ? d.dia.slice(5) : '';

              return (
                <div
                  key={d.dia}
                  style={{
                    flex: '1 1 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end'
                  }}
                  title={`${d.dia}: ${d.visitas} visitas, ${d.clics} clics`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: '45%',
                        maxWidth: '18px',
                        height: `${hVisitas}px`,
                        borderRadius: '4px 4px 0 0',
                        background: '#38bdf8',
                        transition: 'height 0.3s ease'
                      }}
                    />
                    <div
                      style={{
                        width: '45%',
                        maxWidth: '18px',
                        height: `${hClics}px`,
                        borderRadius: '4px 4px 0 0',
                        background: '#10b981',
                        transition: 'height 0.3s ease'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '.65rem', color: 'var(--text-soft, #94a3b8)', marginTop: '4px', whiteSpace: 'nowrap' }}>
                    {diaLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PESTAÑAS DE NAVEGACIÓN ── */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '0 22px',
          borderBottom: '1px solid var(--border, #e5e7eb)',
          overflowX: 'auto'
        }}
      >
        {[
          { id: 'recientes', label: 'Últimas Llegadas en Vivo', badge: datos?.recientes?.length || 0 },
          { id: 'anuncios', label: 'Por Anuncio', badge: datos?.porAnuncio?.length || 0 },
          { id: 'campanas', label: 'Campañas & Conjuntos' },
          { id: 'ubicaciones', label: 'Ubicación & Dispositivo' },
          { id: 'diagnostico', label: 'Diagnóstico & Configuración Meta' }
        ].map((tab) => {
          const activa = tabActiva === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabActiva(tab.id)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '12px 16px',
                fontSize: '.82rem',
                fontWeight: activa ? 700 : 600,
                color: activa ? 'var(--wa-teal-deep, #0f766e)' : 'var(--text-soft, #6b7280)',
                borderBottom: activa ? '2px solid var(--wa-teal, #00a884)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    padding: '1px 7px',
                    borderRadius: '99px',
                    fontSize: '.68rem',
                    background: activa ? 'var(--wa-teal, #00a884)' : 'var(--bg-app, #e5e7eb)',
                    color: activa ? '#ffffff' : 'var(--text-soft, #6b7280)',
                    fontWeight: 700
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CONTENIDO DE LAS PESTAÑAS ── */}
      <div style={{ padding: '20px 22px' }}>
        {/* TAB 1: REGISTRO DE EVENTOS RECIENTES EN VIVO */}
        {tabActiva === 'recientes' && (
          <div>
            {/* BARRA DE FILTROS Y BÚSQUEDA */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '.74rem', fontWeight: 600, color: 'var(--text-soft, #6b7280)', marginRight: '4px' }}>
                  Mostrar:
                </span>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'visita', label: 'Visitas' },
                  { id: 'clic_comprar', label: 'Clics en comprar' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroTipo(f.id)}
                    style={{
                      border: '1px solid var(--border, #e5e7eb)',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '.75rem',
                      fontWeight: filtroTipo === f.id ? 700 : 500,
                      background: filtroTipo === f.id ? 'var(--wa-teal-deep, #0f766e)' : 'var(--bg-panel, #ffffff)',
                      color: filtroTipo === f.id ? '#ffffff' : 'var(--text-body, #374151)',
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* BUSCADOR */}
              <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px', maxWidth: '380px' }}>
                <input
                  type="text"
                  placeholder="Buscar por anuncio, campaña, ID o SCK…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #d1d5db)',
                    fontSize: '.8rem',
                    background: 'var(--bg-panel, #ffffff)',
                    color: 'var(--text-strong, #111827)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-soft, #9ca3af)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: 'absolute', left: '10px', top: '11px' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '8px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-soft, #9ca3af)',
                      padding: 0
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* LISTA DE EVENTOS */}
            {eventosFiltrados.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  borderRadius: '12px',
                  background: 'var(--bg-app, #f9fafb)',
                  border: '1px dashed var(--border, #d1d5db)',
                  color: 'var(--text-soft, #6b7280)',
                  fontSize: '.84rem'
                }}
              >
                No se encontraron eventos que coincidan con el filtro seleccionado.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {eventosFiltrados.map((ev, idx) => {
                  const fallback = extraerParamsFallback(ev.url);
                  const anuncioNombre = ev.utm_content || fallback.utm_content || '';
                  const campanaNombre = ev.utm_campaign || fallback.utm_campaign || '';
                  const adId = ev.ad_id || fallback.ad_id || '';
                  const placement = formatoUbicacion(ev.placement || fallback.placement);
                  const sck = ev.destino_sck || ev.sck || fallback.sck || '';
                  const off = ev.destino_off || fallback.off || '';
                  const esCompra = ev.tipo === 'clic_comprar';
                  const expandido = eventoExpandido === idx;

                  return (
                    <div
                      key={`${ev.ts}-${idx}`}
                      style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border, #e2e8f0)',
                        background: expandido ? 'var(--bg-app, #f8fafc)' : 'var(--bg-panel, #ffffff)',
                        transition: 'all 0.15s ease',
                        boxShadow: expandido ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {/* FILA PRINCIPAL DEL EVENTO */}
                      <div
                        onClick={() => setEventoExpandido(expandido ? null : idx)}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          cursor: 'pointer',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
                          {/* BADGE TIPO */}
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '.7rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '.04em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: esCompra ? '#dcfce7' : '#e0e7ff',
                              color: esCompra ? '#15803d' : '#4338ca',
                              border: esCompra ? '1px solid #86efac' : '1px solid #c7d2fe'
                            }}
                          >
                            {esCompra ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="9" cy="21" r="1" />
                                  <circle cx="20" cy="21" r="1" />
                                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                </svg>
                                Clic Comprar
                              </>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                Visita
                              </>
                            )}
                          </span>

                          {/* ANUNCIO Y DETALLES PRINCIPALES */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '.84rem', fontWeight: 700, color: 'var(--text-strong, #111827)' }}>
                                {anuncioNombre ? legible(anuncioNombre) : '(Sin nombre de anuncio)'}
                              </span>

                              {adId && (
                                <span style={{ fontSize: '.68rem', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                                  ID: {adId}
                                </span>
                              )}

                              {sck && (
                                <span style={{ fontSize: '.68rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  SCK: {sck}
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '.74rem', color: 'var(--text-soft, #6b7280)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              {campanaNombre && <span>Campaña: <b>{legible(campanaNombre)}</b></span>}
                              {placement !== '—' && <span>Ubicación: <b>{placement}</b></span>}
                              {ev.ref && <span>Viene de: <b>{ev.ref}</b></span>}
                              <span>{ev.disp === 'm' ? '📱 Móvil' : '💻 Computadora'}</span>
                            </div>
                          </div>
                        </div>

                        {/* HORA, BOTÓN DESCARTAR Y BOTÓN EXPANDIR */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={(e) => eliminarEventoIndividual(ev.id, ev.ts, e)}
                            disabled={eliminando}
                            title="Descartar este evento de prueba"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-soft, #9ca3af)',
                              cursor: 'pointer',
                              padding: '5px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.background = '#fee2e2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-soft, #9ca3af)';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text-strong, #111827)' }}>
                              {tiempoRelativo(ev.ts)}
                            </div>
                            <div style={{ fontSize: '.68rem', color: 'var(--text-soft, #94a3b8)' }}>
                              {horaLegible(ev.ts)}
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: '.76rem',
                              color: 'var(--text-soft, #64748b)',
                              transform: expandido ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s ease'
                            }}
                          >
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* DETALLES EXPANDIBLES (INSPECTOR COMPLETO DEL EVENTO) */}
                      {expandido && (
                        <div
                          style={{
                            padding: '14px 16px',
                            borderTop: '1px solid var(--border, #e2e8f0)',
                            background: 'var(--bg-panel, #ffffff)',
                            fontSize: '.78rem'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '.76rem', color: 'var(--text-soft, #64748b)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '8px' }}>
                            Inspección detallada de parámetros recibidos
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: '10px',
                              marginBottom: '12px'
                            }}
                          >
                            <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border, #e2e8f0)' }}>
                              <div style={{ color: 'var(--text-soft, #64748b)', fontSize: '.7rem' }}>utm_content (Anuncio)</div>
                              <div style={{ fontWeight: 600, marginTop: '2px' }}>{legible(anuncioNombre) || '—'}</div>
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border, #e2e8f0)' }}>
                              <div style={{ color: 'var(--text-soft, #64748b)', fontSize: '.7rem' }}>utm_campaign (Campaña)</div>
                              <div style={{ fontWeight: 600, marginTop: '2px' }}>{legible(campanaNombre) || '—'}</div>
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border, #e2e8f0)' }}>
                              <div style={{ color: 'var(--text-soft, #64748b)', fontSize: '.7rem' }}>ad_id (ID en Meta)</div>
                              <div style={{ fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>{adId || '—'}</div>
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border, #e2e8f0)' }}>
                              <div style={{ color: 'var(--text-soft, #64748b)', fontSize: '.7rem' }}>placement (Dónde se vio)</div>
                              <div style={{ fontWeight: 600, marginTop: '2px' }}>{placement}</div>
                            </div>
                            {sck && (
                              <div style={{ padding: '8px 10px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                <div style={{ color: '#047857', fontSize: '.7rem', fontWeight: 700 }}>sck (Tracking en Hotmart)</div>
                                <div style={{ fontWeight: 800, marginTop: '2px', color: '#065f46', fontFamily: 'monospace' }}>{sck}</div>
                              </div>
                            )}
                            {off && (
                              <div style={{ padding: '8px 10px', borderRadius: '8px', background: '#fdf4ff', border: '1px solid #f0abfc' }}>
                                <div style={{ color: '#86198f', fontSize: '.7rem', fontWeight: 700 }}>Oferta elegida (off)</div>
                                <div style={{ fontWeight: 700, marginTop: '2px', color: '#701a75' }}>{off}</div>
                              </div>
                            )}
                          </div>

                          {/* URL COMPLETA RECIBIDA */}
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ color: 'var(--text-soft, #64748b)', fontSize: '.7rem', marginBottom: '3px' }}>
                              Dirección de entrada exacta (sin guardar fbclid por privacidad):
                            </div>
                            <div
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: 'var(--bg-app, #f1f5f9)',
                                fontFamily: 'monospace',
                                fontSize: '.72rem',
                                color: 'var(--text-strong, #334155)',
                                overflowWrap: 'anywhere'
                              }}
                            >
                              {legible(ev.url) || '(vacía)'}
                            </div>
                          </div>

                          {ev.destino && (
                            <div style={{ marginTop: '10px' }}>
                              <div style={{ color: '#047857', fontSize: '.7rem', marginBottom: '3px', fontWeight: 600 }}>
                                Enlace de pago de Hotmart al que fue derivado:
                              </div>
                              <div
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  background: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  fontFamily: 'monospace',
                                  fontSize: '.72rem',
                                  color: '#065f46',
                                  overflowWrap: 'anywhere'
                                }}
                              >
                                {legible(ev.destino)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AGRUPADO POR ANUNCIO */}
        {tabActiva === 'anuncios' && (
          <div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-soft, #6b7280)', marginBottom: '14px' }}>
              Rendimiento de cada anuncio individual: visitas captadas e intención de compra en Hotmart.
            </div>

            {(!datos?.porAnuncio || datos.porAnuncio.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-soft, #6b7280)', background: 'var(--bg-app, #f9fafb)', borderRadius: '10px' }}>
                Aún no hay visitas con atribución de anuncio registrada en este período.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border, #e5e7eb)', color: 'var(--text-soft, #6b7280)', fontSize: '.72rem' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>#</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>Anuncio (utm_content / ad_id)</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Visitas</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Clics Checkout</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Conversión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.porAnuncio.map((a, i) => (
                      <tr
                        key={a.nombre}
                        style={{
                          borderBottom: '1px solid var(--border, #f1f5f9)',
                          background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover, #fcfcfc)'
                        }}
                      >
                        <td style={{ padding: '10px', color: 'var(--text-soft, #94a3b8)', fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-strong, #111827)', maxWidth: '380px', overflowWrap: 'anywhere' }}>
                          {legible(a.nombre)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {a.visitas.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: a.clics ? '#059669' : 'var(--text-soft, #94a3b8)' }}>
                          {a.clics.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '.76rem',
                              background: a.tasa >= 10 ? '#dcfce7' : a.tasa > 0 ? '#fef3c7' : 'var(--bg-app, #f1f5f9)',
                              color: a.tasa >= 10 ? '#15803d' : a.tasa > 0 ? '#b45309' : 'var(--text-soft, #64748b)'
                            }}
                          >
                            {pctTxt(a.tasa)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POR CAMPAÑA Y POR CONJUNTO */}
        {tabActiva === 'campanas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* POR CAMPAÑA */}
            <div>
              <h3 style={{ fontSize: '.86rem', fontWeight: 800, margin: '0 0 10px', color: 'var(--text-strong, #111827)' }}>
                Por Campaña (utm_campaign)
              </h3>
              {(!datos?.porCampana || datos.porCampana.length === 0) ? (
                <div style={{ padding: '20px', color: 'var(--text-soft, #6b7280)', background: 'var(--bg-app, #f9fafb)', borderRadius: '10px' }}>
                  Sin datos de campaña.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {datos.porCampana.map((c) => (
                    <div
                      key={c.nombre}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border, #e5e7eb)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--text-strong, #111827)' }}>
                        {legible(c.nombre)}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '.76rem', fontVariantNumeric: 'tabular-nums' }}>
                        <span><b>{c.visitas}</b> visitas</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}><b>{c.clics}</b> clics ({pctTxt(c.tasa)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* POR CONJUNTO (ADSET) */}
            <div>
              <h3 style={{ fontSize: '.86rem', fontWeight: 800, margin: '0 0 10px', color: 'var(--text-strong, #111827)' }}>
                Por Conjunto de Anuncios (utm_term / adset_id)
              </h3>
              {(!datos?.porAdset || datos.porAdset.length === 0) ? (
                <div style={{ padding: '20px', color: 'var(--text-soft, #6b7280)', background: 'var(--bg-app, #f9fafb)', borderRadius: '10px' }}>
                  Sin datos de conjunto.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {datos.porAdset.map((adset) => (
                    <div
                      key={adset.nombre}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border, #e5e7eb)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--text-strong, #111827)' }}>
                        {legible(adset.nombre)}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '.76rem', fontVariantNumeric: 'tabular-nums' }}>
                        <span><b>{adset.visitas}</b> visitas</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}><b>{adset.clics}</b> clics ({pctTxt(adset.tasa)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: UBICACIÓN Y DISPOSITIVO */}
        {tabActiva === 'ubicaciones' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* DÓNDE SE VIO (PLACEMENT) */}
            <div>
              <h3 style={{ fontSize: '.86rem', fontWeight: 800, margin: '0 0 10px', color: 'var(--text-strong, #111827)' }}>
                Dónde se vio el anuncio (Placement / Ubicación)
              </h3>
              {(!datos?.porUbicacion || datos.porUbicacion.length === 0) ? (
                <div style={{ padding: '20px', color: 'var(--text-soft, #6b7280)', background: 'var(--bg-app, #f9fafb)', borderRadius: '10px' }}>
                  Sin datos de ubicación. Configura <code>placement={'{{placement}}'}</code> en los parámetros de Meta.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {datos.porUbicacion.map((u) => (
                    <div
                      key={u.nombre}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border, #e5e7eb)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--text-strong, #111827)' }}>
                        {formatoUbicacion(u.nombre)}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '.76rem', fontVariantNumeric: 'tabular-nums' }}>
                        <span><b>{u.visitas}</b> visitas</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}><b>{u.clics}</b> clics ({pctTxt(u.tasa)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DISPOSITIVO Y REFERRER */}
            <div>
              <h3 style={{ fontSize: '.86rem', fontWeight: 800, margin: '0 0 10px', color: 'var(--text-strong, #111827)' }}>
                Dispositivo & Origen
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {datos?.porDispositivo?.map((d) => (
                  <div
                    key={d.nombre}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border, #e5e7eb)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '.82rem' }}>
                      {d.nombre === 'celular' ? '📱 Celular / Móvil' : d.nombre === 'computadora' ? '💻 Computadora / Desktop' : 'Desconocido'}
                    </span>
                    <div style={{ fontSize: '.76rem', fontVariantNumeric: 'tabular-nums' }}>
                      <b>{d.visitas}</b> visitas ({pctTxt(d.tasa)} clic checkout)
                    </div>
                  </div>
                ))}

                {datos?.porReferrer?.map((r) => (
                  <div
                    key={r.nombre}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border, #e5e7eb)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-app, #f9fafb)'
                    }}
                  >
                    <span style={{ fontSize: '.8rem', color: 'var(--text-soft, #475569)' }}>
                      Referrer: <b>{r.nombre}</b>
                    </span>
                    <span style={{ fontSize: '.76rem', fontVariantNumeric: 'tabular-nums' }}>
                      {r.visitas} visitas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DIAGNÓSTICO Y CONFIGURACIÓN */}
        {tabActiva === 'diagnostico' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '.9rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-strong, #111827)' }}>
                Chequeo de Configuración de Meta Ads
              </h3>
              <p style={{ fontSize: '.78rem', color: 'var(--text-soft, #6b7280)', margin: 0 }}>
                Verifica si tus anuncios están enviando los parámetros necesarios para que el sistema identifique exactamente de dónde viene cada compra.
              </p>
            </div>

            {/* GRILLA DE ESTADOS DE DIAGNÓSTICO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {[
                { campo: 'conUtm', label: 'utm_source (Plataforma)', ayuda: 'Indica que el clic vino de Facebook/Meta.' },
                { campo: 'conAnuncio', label: 'utm_content (Nombre de anuncio)', ayuda: 'Permite separar las métricas por cada anuncio gráfico o video.' },
                { campo: 'conAdId', label: 'ad_id (ID de Anuncio de Meta)', ayuda: 'Se envía dentro de sck a Hotmart para atribuir ventas.' },
                { campo: 'conAdset', label: 'adset_id (ID Conjunto de anuncios)', ayuda: 'Identifica la audiencia o conjunto ganador.' },
                { campo: 'conCampaignId', label: 'campaign_id (ID Campaña)', ayuda: 'Agrupa el rendimiento por campaña.' },
                { campo: 'conPlacement', label: 'placement (Ubicación en pantalla)', ayuda: 'Diferencia Reels, Stories, Feed de Facebook, etc.' },
                { campo: 'clicsConSck', label: 'sck en Checkout de Hotmart', ayuda: 'Garantiza que la compra en Hotmart quede vinculada al anuncio.' }
              ].map((c) => {
                const item = dg?.[c.campo] || { n: 0, de: 0, pct: 0 };
                const pct = item.pct ?? 0;
                const estado = pct >= 85 ? 'Optimo' : pct > 0 ? 'Parcial' : 'Inactivo';
                const colorBg = pct >= 85 ? '#dcfce7' : pct > 0 ? '#fef3c7' : '#fee2e2';
                const colorTxt = pct >= 85 ? '#15803d' : pct > 0 ? '#b45309' : '#b91c1c';

                return (
                  <div
                    key={c.campo}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1px solid var(--border, #e5e7eb)',
                      background: 'var(--bg-app, #f8fafc)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--text-strong, #111827)' }}>
                        {c.label}
                      </span>
                      <span
                        style={{
                          fontSize: '.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: colorBg,
                          color: colorTxt,
                          textTransform: 'uppercase'
                        }}
                      >
                        {estado} ({pctTxt(pct)})
                      </span>
                    </div>
                    <div style={{ fontSize: '.74rem', color: 'var(--text-soft, #6b7280)', marginBottom: '8px' }}>
                      {c.ayuda}
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-soft, #94a3b8)', fontVariantNumeric: 'tabular-nums' }}>
                      Registrado en {item.n} de {item.de} eventos
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CÓDIGO A COPIAR EN META ADS MANAGER */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: '12px',
                background: 'var(--bg-panel, #ffffff)',
                border: '1px solid var(--border, #e2e8f0)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '.86rem', fontWeight: 800, color: 'var(--text-strong, #111827)' }}>
                    Parámetros de URL para Meta Ads Manager
                  </h4>
                  <div style={{ fontSize: '.76rem', color: 'var(--text-soft, #6b7280)', marginTop: '2px' }}>
                    Pega este texto en Meta Ads Manager → Nivel Anuncio → Sección <b>Seguimiento</b> → <b>Parámetros de URL</b>:
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copiarParametros}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: copiado ? '#10b981' : '#4f46e5',
                    color: '#ffffff',
                    fontSize: '.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copiado ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      ¡Copiado al portapapeles!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copiar Parámetros
                    </>
                  )}
                </button>
              </div>

              <code
                style={{
                  display: 'block',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-app, #f1f5f9)',
                  color: 'var(--text-strong, #0f172a)',
                  fontSize: '.74rem',
                  fontFamily: 'monospace',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.5,
                  border: '1px solid var(--border, #e2e8f0)'
                }}
              >
                {PARAMETROS_META}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL PARA LIMPIAR PRUEBAS ── */}
      {modalLimpiar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => !eliminando && setModalLimpiar(false)}
        >
          <div
            style={{
              background: 'var(--bg-panel, #ffffff)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border, #e5e7eb)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-strong, #111827)' }}>
                  Limpiar visitas de prueba
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '.76rem', color: 'var(--text-soft, #6b7280)' }}>
                  Elige qué eventos deseas descartar para no alterar tus estadísticas reales.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0' }}>
              <button
                type="button"
                onClick={() => ejecutarLimpieza('sin_utm')}
                disabled={eliminando}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border, #e5e7eb)',
                  background: 'var(--bg-app, #f8fafc)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '.84rem', color: 'var(--text-strong, #111827)' }}>
                  1. Borrar solo visitas directas (Sin UTM)
                </div>
                <div style={{ fontSize: '.74rem', color: 'var(--text-soft, #6b7280)', marginTop: '3px', lineHeight: 1.4 }}>
                  Elimina únicamente las pruebas en las que entraste directo a la landing o sin parámetros de anuncio. Conserva las que tengan datos de Meta.
                </div>
              </button>

              <button
                type="button"
                onClick={() => ejecutarLimpieza('todas')}
                disabled={eliminando}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '.84rem', color: '#b91c1c' }}>
                  2. Reiniciar todo el historial a cero (Reset total)
                </div>
                <div style={{ fontSize: '.74rem', color: '#991b1b', marginTop: '3px', lineHeight: 1.4 }}>
                  Vacía todos los registros acumulados hasta hoy para empezar desde cero con el tráfico de tus campañas activas.
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setModalLimpiar(false)}
                disabled={eliminando}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border, #d1d5db)',
                  background: 'var(--bg-panel, #ffffff)',
                  color: 'var(--text-strong, #374151)',
                  fontSize: '.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Visitas;
