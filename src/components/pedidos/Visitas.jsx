import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { visitasService } from '../../services/visitas.service';

/**
 * Visitas a la web (Plan 21): de dónde llega la gente.
 *
 * Esta pantalla responde dos preguntas antes de mirar ventas:
 *   1. ¿El anuncio le está mandando a la página sus datos (anuncio, conjunto,
 *      campaña, ubicación)? Se mide sobre visitas reales, no se supone.
 *   2. ¿El botón de comprar le pasa a Hotmart el ID del anuncio (sck)? Sin eso
 *      la venta no se puede atribuir.
 *
 * La landing manda cada entrada al backend sin cookies ni IP. Acá solo se lee.
 * Si la base de datos no responde, el backend guarda en memoria y lo avisa.
 */

const PERIODOS = [
  { dias: 1, texto: 'Hoy' },
  { dias: 7, texto: '7 días' },
  { dias: 30, texto: '30 días' }
];

const VISTAS = [
  { clave: 'porAnuncio', texto: 'Por anuncio', col: 'Anuncio' },
  { clave: 'porAdset', texto: 'Por conjunto', col: 'Conjunto de anuncios' },
  { clave: 'porCampana', texto: 'Por campaña', col: 'Campaña' },
  { clave: 'porUbicacion', texto: 'Dónde se vio', col: 'Ubicación' },
  { clave: 'porDispositivo', texto: 'Dispositivo', col: 'Dispositivo' },
  { clave: 'recientes', texto: 'Últimas llegadas', col: '' }
];

const CHEQUEOS = [
  { campo: 'conUtm', texto: 'Llega utm_source', ayuda: 'Si no llega, el anuncio no está mandando los parámetros a la página.' },
  { campo: 'conAnuncio', texto: 'Llega utm_content (qué anuncio)', ayuda: 'Es lo que separa un anuncio de otro.' },
  { campo: 'conAdset', texto: 'Llega adset_id (conjunto)', ayuda: 'Se activa con adset_id={{adset.id}} en Parámetros de URL.' },
  { campo: 'conCampaignId', texto: 'Llega campaign_id (campaña)', ayuda: 'Se activa con campaign_id={{campaign.id}}.' },
  { campo: 'conAdId', texto: 'Llega ad_id (ID del anuncio)', ayuda: 'Se activa con ad_id={{ad.id}}. Es el que viaja a Hotmart dentro de sck.' },
  { campo: 'conPlacement', texto: 'Llega placement (dónde se vio)', ayuda: 'Se activa con placement={{placement}}: Feed, Reels, Stories…' },
  { campo: 'clicsConSck', texto: 'El enlace a Hotmart lleva sck', ayuda: 'Se mide en los clics en comprar: sck es lo que Hotmart guarda para atribuir la venta.' }
];

// Se pega en el anuncio, en Seguimiento → Parámetros de URL. Meta reemplaza cada {{…}} en cada clic.
const PARAMETROS_ANUNCIO =
  'utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}' +
  '&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}&site={{site_source_name}}';

const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: '7px 6px' };
const pctTxt = (p) => (p === null || p === undefined ? '—' : `${String(p).replace('.', ',')}%`);

/** Las direcciones llegan codificadas (%20, +): se muestran legibles. */
function legible(texto) {
  try { return decodeURIComponent(String(texto || '').replace(/\+/g, ' ')); } catch { return String(texto || ''); }
}

function hora(ts) {
  try {
    return new Date(ts).toLocaleString('es-PY', {
      timeZone: 'America/Asuncion', hour12: false, day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch { return ts; }
}

function estadoDe(d) {
  if (!d || !d.de) return { texto: 'Sin datos', color: 'var(--text-soft)', fondo: 'var(--bg-soft, #eee)' };
  if (d.pct >= 90) return { texto: 'Bien', color: '#047857', fondo: '#dcf2e4' };
  if (d.pct > 0) return { texto: 'Parcial', color: '#b45309', fondo: '#fbefd2' };
  return { texto: 'No llega', color: '#b91c1c', fondo: '#fbe0dd' };
}

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-pill ${activo ? 'active' : ''}`}
      style={{ padding: '5px 12px', fontSize: '.78rem' }}
    >
      {children}
    </button>
  );
}

function Cifra({ valor, etiqueta, fuerte, color }) {
  return (
    <div style={{ minWidth: '92px', flex: '1 1 92px' }}>
      <div style={{
        fontSize: fuerte ? '1.25rem' : '1.05rem', fontWeight: 800, lineHeight: 1.15,
        fontVariantNumeric: 'tabular-nums', color: color || 'inherit'
      }}>
        {valor}
      </div>
      <div style={{ fontSize: '.7rem', color: 'var(--text-soft)', marginTop: '2px' }}>{etiqueta}</div>
    </div>
  );
}

function TablaGrupo({ filas, columna }) {
  if (!filas?.length) {
    return <div style={{ fontSize: '.84rem', color: 'var(--text-soft)', padding: '6px 0' }}>Todavía no hay datos.</div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem', minWidth: '420px' }}>
        <thead>
          <tr style={{ color: 'var(--text-soft)', fontSize: '.7rem', textAlign: 'left' }}>
            <th style={{ padding: '6px 6px 6px 0', fontWeight: 600 }}>{columna}</th>
            <th style={{ ...num, fontWeight: 600 }}>Visitas</th>
            <th style={{ ...num, fontWeight: 600 }}>Clics en comprar</th>
            <th style={{ ...num, fontWeight: 600 }}>Clic / visita</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.nombre} style={{ borderTop: '1px solid var(--border-gold, #eee)' }}>
              <td style={{ padding: '7px 6px 7px 0', maxWidth: '320px', overflowWrap: 'anywhere', fontWeight: 600 }}>{f.nombre}</td>
              <td style={num}>{f.visitas}</td>
              <td style={{ ...num, fontWeight: 700, color: f.clics ? '#047857' : 'var(--text-soft)' }}>{f.clics}</td>
              <td style={num}>{f.visitas ? pctTxt(f.tasa) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Recientes({ filas }) {
  if (!filas?.length) {
    return <div style={{ fontSize: '.84rem', color: 'var(--text-soft)', padding: '6px 0' }}>Todavía no llegó ninguna visita.</div>;
  }
  return (
    <div style={{ display: 'grid', gap: '2px' }}>
      {filas.map((e, i) => (
        <div key={`${e.ts}-${i}`} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--border-gold, #eee)' : 'none' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap', fontSize: '.74rem' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-soft)' }}>{hora(e.ts)}</span>
            <span style={{
              fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: '.68rem',
              color: e.tipo === 'visita' ? '#4338ca' : '#b45309'
            }}>
              {e.tipo === 'visita' ? 'Visita' : 'Clic en comprar'}
            </span>
            {e.ref && <span style={{ color: 'var(--text-soft)' }}>viene de {e.ref}</span>}
            {e.disp && <span style={{ color: 'var(--text-soft)' }}>{e.disp === 'm' ? 'celular' : 'computadora'}</span>}
          </div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '.72rem', overflowWrap: 'anywhere', marginTop: '3px' }}>
            {legible(e.url) || '(vacía)'}
          </div>
          {e.destino && (
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '.72rem', overflowWrap: 'anywhere', marginTop: '3px', color: 'var(--text-soft)' }}>
              → {legible(e.destino)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Visitas() {
  const { token, user } = useAuth();
  const esAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [dias, setDias] = useState(7);
  const [vista, setVista] = useState('porAnuncio');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    if (!esAdmin) return;
    setCargando(true);
    try {
      setError(null);
      setDatos(await visitasService.resumen(token, dias));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [token, dias, esAdmin]);

  useEffect(() => { cargar(); }, [cargar]);

  // Se actualiza solo cada 30 segundos mientras la pantalla está abierta.
  useEffect(() => {
    if (!esAdmin) return undefined;
    const id = setInterval(cargar, 30000);
    return () => clearInterval(id);
  }, [cargar, esAdmin]);

  async function copiarParametros() {
    try {
      await navigator.clipboard.writeText(PARAMETROS_ANUNCIO);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* el texto está a la vista para copiarlo a mano */ }
  }

  if (!esAdmin) return null;

  const t = datos?.totales;
  const dg = datos?.diagnostico;
  const vistaActual = VISTAS.find(v => v.clave === vista) || VISTAS[0];

  return (
    <section style={{
      marginBottom: '22px', padding: '16px 18px', borderRadius: '10px',
      border: '1px solid var(--border-gold, #e2e2e2)', background: 'var(--bg-card, #fff)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '.74rem', fontWeight: 700, letterSpacing: '.04em', color: 'var(--text-soft)' }}>
            VISITAS A LA WEB (PLAN 21) — DE DÓNDE LLEGA LA GENTE
          </div>
          <div style={{ fontSize: '.74rem', color: 'var(--text-soft)', marginTop: '3px' }}>
            Cada entrada a la página, con los datos del anuncio por el que llegó. Sin cookies ni IP. Hora de Paraguay.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {PERIODOS.map(p => (
            <Chip key={p.dias} activo={dias === p.dias} onClick={() => setDias(p.dias)}>{p.texto}</Chip>
          ))}
          <button
            type="button"
            onClick={cargar}
            disabled={cargando}
            style={{ background: 'none', border: 'none', padding: '0 4px', color: '#4338ca', cursor: 'pointer', fontSize: '.76rem', fontWeight: 600 }}
          >
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', fontSize: '.82rem', marginBottom: '8px' }}>{error}</div>}

      {datos && datos.almacenamiento !== 'postgres' && (
        <div style={{ fontSize: '.78rem', marginBottom: '10px', padding: '8px 10px', borderRadius: '8px', background: '#fbefd2', color: '#8a5a00' }}>
          La base de datos no responde: por ahora las visitas se guardan en memoria y se pierden si el servicio se reinicia o se duerme.
        </div>
      )}

      {t && (
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <Cifra valor={t.visitas} etiqueta="Visitas" fuerte />
          <Cifra valor={t.clics} etiqueta={`Clics en comprar · ${pctTxt(t.tasaClic)}`} fuerte color="#047857" />
          <Cifra valor={pctTxt(dg?.conFbclid?.pct)} etiqueta="Llegan de Meta (fbclid)" />
          <Cifra valor={pctTxt(dg?.conUtm?.pct)} etiqueta="Llegan con UTM" />
          <Cifra valor={pctTxt(dg?.clicsConSck?.pct)} etiqueta="Clics con sck a Hotmart" />
        </div>
      )}

      {dg && (
        <div style={{ marginBottom: '14px', borderRadius: '8px', border: '1px solid var(--border-gold, #eee)', padding: '4px 12px' }}>
          {CHEQUEOS.map((c, i) => {
            const d = dg[c.campo];
            const est = estadoDe(d);
            return (
              <div
                key={c.campo}
                style={{
                  display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: '2px 10px', alignItems: 'baseline',
                  padding: '8px 0', borderTop: i ? '1px solid var(--border-gold, #eee)' : 'none'
                }}
              >
                <span style={{
                  fontSize: '.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center',
                  padding: '2px 8px', borderRadius: '99px', background: est.fondo, color: est.color
                }}>
                  {est.texto}
                </span>
                <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{c.texto}</span>
                <span style={{ fontSize: '.76rem', color: 'var(--text-soft)', fontVariantNumeric: 'tabular-nums' }}>
                  {d?.n ?? 0} de {d?.de ?? 0} · {pctTxt(d?.pct)}
                </span>
                <span style={{ gridColumn: '2 / 4', fontSize: '.72rem', color: 'var(--text-soft)' }}>{c.ayuda}</span>
              </div>
            );
          })}
        </div>
      )}

      {datos && (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', borderBottom: '1px solid var(--border-gold, #eee)', paddingBottom: '8px' }}>
            {VISTAS.map(v => (
              <Chip key={v.clave} activo={vista === v.clave} onClick={() => setVista(v.clave)}>{v.texto}</Chip>
            ))}
          </div>
          {vista === 'recientes'
            ? <Recientes filas={datos.recientes} />
            : <TablaGrupo filas={datos[vista]} columna={vistaActual.col} />}
        </>
      )}

      <details style={{ marginTop: '14px', fontSize: '.78rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Qué pegar en “Parámetros de URL” de cada anuncio</summary>
        <div style={{ color: 'var(--text-soft)', margin: '8px 0 6px' }}>
          Va en el anuncio, en Seguimiento. Meta reemplaza cada {'{{…}}'} con los datos reales en cada clic.
        </div>
        <code style={{
          display: 'block', padding: '9px 11px', borderRadius: '8px', background: 'var(--bg-soft, #f7f7f7)',
          fontSize: '.72rem', overflowWrap: 'anywhere'
        }}>
          {PARAMETROS_ANUNCIO}
        </code>
        <button
          type="button"
          onClick={copiarParametros}
          style={{ marginTop: '6px', background: 'none', border: 'none', padding: 0, color: '#4338ca', cursor: 'pointer', fontSize: '.76rem', fontWeight: 600 }}
        >
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </details>
    </section>
  );
}

export default Visitas;
