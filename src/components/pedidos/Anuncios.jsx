import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { anunciosService } from '../../services/anuncios.service';

/**
 * De qué anuncio viene la gente y cuánto vende cada uno.
 *
 * El Administrador de anuncios dice cuánto costó cada conversación. No sabe
 * quién pagó: eso lo sabe este sistema. Esta tabla junta las dos cosas por
 * anuncio, con el mismo corte de días que usa Meta (hora de Paraguay), para
 * poder decir "este anuncio trae gente que compra" y no solo "trae gente que
 * escribe".
 *
 * El nombre del anuncio no viene en el mensaje de Meta: se carga una vez,
 * pegando la tabla exportada del Administrador de anuncios.
 */

const PERIODOS = [
  { clave: 'hoy', texto: 'Hoy' },
  { clave: 'ayer', texto: 'Ayer' },
  { clave: '7d', texto: '7 días' },
  { clave: '30d', texto: '30 días' }
];

const gs = (n) => `Gs. ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`;
const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

/** "25.000", "25000", "Gs. 25.000" → 25000. */
function leerGs(texto) {
  const limpio = String(texto || '').replace(/[^\d]/g, '');
  return limpio ? parseInt(limpio, 10) : 0;
}

const estiloCampo = {
  padding: '6px 8px', borderRadius: '7px', border: '1px solid var(--border-gold, #ddd)',
  fontSize: '.82rem', background: 'var(--bg-panel, transparent)', color: 'inherit', boxSizing: 'border-box'
};
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: '7px 6px' };

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

export function Anuncios() {
  const { token, user } = useAuth();
  const esAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [periodo, setPeriodo] = useState('hoy');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [gasto, setGasto] = useState('');
  const [editando, setEditando] = useState(null); // { ad_id, nombre, conjunto }
  const [importando, setImportando] = useState(false);
  const [pegado, setPegado] = useState('');
  const [aviso, setAviso] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      setDatos(await anunciosService.rendimiento(token, periodo));
    } catch (e) {
      setError(e.message);
    }
  }, [token, periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardarNombre(e) {
    e.preventDefault();
    setTrabajando(true);
    try {
      await anunciosService.nombrar(token, editando.ad_id, {
        nombre: editando.nombre, conjunto: editando.conjunto
      });
      setEditando(null);
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    } finally {
      setTrabajando(false);
    }
  }

  async function importar(e) {
    e.preventDefault();
    setTrabajando(true);
    setAviso(null);
    try {
      const r = await anunciosService.importar(token, pegado);
      setAviso({ ok: true, texto: `Listo: ${r.importados} anuncio${r.importados === 1 ? '' : 's'} con nombre.` });
      setPegado('');
      setImportando(false);
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    } finally {
      setTrabajando(false);
    }
  }

  async function sincronizar() {
    setTrabajando(true);
    setAviso(null);
    try {
      const r = await anunciosService.sincronizar(token);
      setAviso({ ok: true, texto: `Listo: ${r.anuncios} anuncios traídos del Administrador de anuncios.` });
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    } finally {
      setTrabajando(false);
    }
  }

  async function leerArchivo(ev) {
    const archivo = ev.target.files?.[0];
    if (!archivo) return;
    setPegado(await archivo.text());
    ev.target.value = '';
  }

  const total = datos?.total;
  const anuncios = datos?.anuncios || [];
  const meta = datos?.meta || null;
  // Con Meta conectado el gasto llega solo, por anuncio. Si no, se escribe a mano.
  const conGasto = Boolean(meta?.con_gasto);
  const gastoNum = conGasto ? (total?.gasto || 0) : leerGs(gasto);
  const sinNombre = anuncios.filter(a => a.ad_id && !a.nombre).length;

  return (
    <section style={{
      marginBottom: '22px', padding: '16px 18px', borderRadius: '10px',
      border: '1px solid var(--border-gold, #e2e2e2)', background: 'var(--bg-card, #fff)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '.74rem', fontWeight: 700, letterSpacing: '.04em', color: 'var(--text-soft)' }}>
            ANUNCIOS — QUIÉN ESCRIBE Y QUIÉN COMPRA
          </div>
          <div style={{ fontSize: '.74rem', color: 'var(--text-soft)', marginTop: '3px' }}>
            Personas que escribieron por primera vez en el período, y hasta dónde llegaron. Días en hora de Paraguay, igual que Meta.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PERIODOS.map(p => (
            <Chip key={p.clave} activo={periodo === p.clave} onClick={() => setPeriodo(p.clave)}>{p.texto}</Chip>
          ))}
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', fontSize: '.82rem', marginBottom: '8px' }}>{error}</div>}
      {aviso && (
        <div style={{ fontSize: '.8rem', marginBottom: '10px', color: aviso.ok ? '#047857' : '#b91c1c' }}>{aviso.texto}</div>
      )}

      {meta && (
        <div style={{ fontSize: '.74rem', marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {meta.conectado ? (
            <span style={{ color: meta.error ? '#b45309' : '#047857', fontWeight: 600 }}>
              {meta.error ? `Meta: ${meta.error}` : 'Conectado al Administrador de anuncios · el gasto llega solo'}
            </span>
          ) : (
            <span style={{ color: 'var(--text-soft)' }}>
              Sin conexión con el Administrador de anuncios: el gasto se escribe a mano.
            </span>
          )}
          {meta.conectado && esAdmin && (
            <button
              type="button"
              onClick={sincronizar}
              disabled={trabajando}
              style={{ background: 'none', border: 'none', padding: 0, color: '#4338ca', cursor: 'pointer', fontSize: '.74rem', fontWeight: 600 }}
            >
              {trabajando ? 'Trayendo…' : 'Traer nombres ahora'}
            </button>
          )}
        </div>
      )}

      {total && (
        <>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Cifra valor={total.conversaciones} etiqueta="Escribieron" fuerte />
            <Cifra valor={total.recibieron_datos} etiqueta={`Pidieron datos · ${pct(total.recibieron_datos, total.conversaciones)}`} />
            <Cifra valor={total.mandaron_comprobante} etiqueta={`Mandaron comprobante · ${pct(total.mandaron_comprobante, total.conversaciones)}`} />
            <Cifra valor={total.compraron} etiqueta={`Compraron · ${pct(total.compraron, total.conversaciones)}`} fuerte color="#047857" />
            <Cifra valor={gs(total.cobrado)} etiqueta="Cobrado" color="#047857" />
          </div>

          {/* Lo que Meta cobró no llega por ningún lado: se escribe acá, mirando
              el "Importe gastado" del mismo período. Con eso sale lo único que
              importa: si cada venta deja plata o la pierde. */}
          <div style={{
            display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end',
            padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-soft, #f7f7f7)', marginBottom: '14px'
          }}>
            {conGasto ? (
              <Cifra valor={gs(gastoNum)} etiqueta="Gastado en Meta" fuerte />
            ) : (
              <label style={{ fontSize: '.74rem', color: 'var(--text-soft)' }}>
                Gastado en Meta en este período
                <input
                  id="anuncios-gasto"
                  inputMode="numeric"
                  placeholder="Ej: 112.744"
                  value={gasto}
                  onChange={e => setGasto(e.target.value)}
                  style={{ ...estiloCampo, display: 'block', marginTop: '3px', width: '150px' }}
                />
              </label>
            )}
            {gastoNum > 0 && (
              <>
                <Cifra valor={total.conversaciones ? gs(gastoNum / total.conversaciones) : '—'} etiqueta="Costo por persona" />
                <Cifra valor={total.compraron ? gs(gastoNum / total.compraron) : '—'} etiqueta="Costo por venta" />
                <Cifra
                  valor={`${total.cobrado - gastoNum >= 0 ? '+' : '−'}${gs(Math.abs(total.cobrado - gastoNum))}`}
                  etiqueta={total.cobrado - gastoNum >= 0 ? 'Ganancia sobre publicidad' : 'Pérdida sobre publicidad'}
                  fuerte
                  color={total.cobrado - gastoNum >= 0 ? '#047857' : '#b91c1c'}
                />
              </>
            )}
          </div>
        </>
      )}

      {anuncios.length === 0 && datos && (
        <div style={{ fontSize: '.84rem', color: 'var(--text-soft)', padding: '6px 0' }}>
          Nadie escribió todavía en este período.
        </div>
      )}

      {anuncios.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem', minWidth: conGasto ? '860px' : '620px' }}>
            <thead>
              <tr style={{ color: 'var(--text-soft)', fontSize: '.7rem', textAlign: 'left' }}>
                <th style={{ padding: '6px 6px 6px 0', fontWeight: 600 }}>Anuncio</th>
                <th style={{ ...num, fontWeight: 600 }}>Escribieron</th>
                <th style={{ ...num, fontWeight: 600 }}>Pidieron datos</th>
                <th style={{ ...num, fontWeight: 600 }}>Comprobante</th>
                <th style={{ ...num, fontWeight: 600 }}>Compraron</th>
                <th style={{ ...num, fontWeight: 600 }}>Conversión</th>
                <th style={{ ...num, fontWeight: 600 }}>Cobrado</th>
                {conGasto && <th style={{ ...num, fontWeight: 600 }}>Gastado</th>}
                {conGasto && <th style={{ ...num, fontWeight: 600 }}>Costo por venta</th>}
                {conGasto && <th style={{ ...num, fontWeight: 600 }}>Resultado</th>}
              </tr>
            </thead>
            <tbody>
              {anuncios.map(a => {
                const clave = a.ad_id || 'directo';
                const enEdicion = editando?.ad_id === a.ad_id && a.ad_id;
                return (
                  <tr key={clave} style={{ borderTop: '1px solid var(--border-gold, #eee)' }}>
                    <td style={{ padding: '7px 6px 7px 0', maxWidth: '300px' }}>
                      {!a.ad_id ? (
                        <span style={{ color: 'var(--text-soft)' }}>Sin anuncio (escribieron directo)</span>
                      ) : enEdicion ? (
                        <form onSubmit={guardarNombre} style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            id={`anuncio-nombre-${a.ad_id}`}
                            autoFocus
                            placeholder="Nombre (ej: CREATIVO A — CONTROL)"
                            value={editando.nombre}
                            onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                            style={{ ...estiloCampo, width: '190px' }}
                          />
                          <input
                            id={`anuncio-conjunto-${a.ad_id}`}
                            placeholder="Conjunto (ej: CJ001)"
                            value={editando.conjunto}
                            onChange={e => setEditando({ ...editando, conjunto: e.target.value })}
                            style={{ ...estiloCampo, width: '110px' }}
                          />
                          <button type="submit" className="btn-primary" disabled={trabajando} style={{ padding: '5px 10px', fontSize: '.76rem' }}>Guardar</button>
                          <button type="button" onClick={() => setEditando(null)} style={{ padding: '5px 8px', fontSize: '.76rem', background: 'none', border: 'none', color: 'var(--text-soft)', cursor: 'pointer' }}>Cancelar</button>
                        </form>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.nombre || a.titulo || 'Anuncio sin nombre'}
                            {a.conjunto && <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}> · {a.conjunto}</span>}
                          </div>
                          <div style={{ fontSize: '.68rem', color: 'var(--text-soft)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{a.ad_id}</span>
                            {/* Con Meta conectado el nombre viene de allá y se
                                actualiza cada hora: cambiarlo acá no duraría. */}
                            {esAdmin && !meta?.conectado && (
                              <button
                                type="button"
                                onClick={() => setEditando({ ad_id: a.ad_id, nombre: a.nombre || '', conjunto: a.conjunto || '' })}
                                style={{ background: 'none', border: 'none', padding: 0, color: '#4338ca', cursor: 'pointer', fontSize: '.68rem', fontWeight: 600 }}
                              >
                                {a.nombre ? 'Cambiar nombre' : 'Ponerle nombre'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={num}>{a.conversaciones}</td>
                    <td style={num}>{a.recibieron_datos}</td>
                    <td style={num}>{a.mandaron_comprobante}</td>
                    <td style={{ ...num, fontWeight: 700, color: a.compraron ? '#047857' : 'var(--text-soft)' }}>{a.compraron}</td>
                    <td style={{ ...num, fontWeight: 700, color: a.compraron ? '#047857' : 'var(--text-soft)' }}>{pct(a.compraron, a.conversaciones)}</td>
                    <td style={num}>{a.cobrado ? gs(a.cobrado) : '—'}</td>
                    {conGasto && <td style={num}>{a.ad_id ? gs(a.gasto || 0) : '—'}</td>}
                    {conGasto && (
                      <td style={num}>{a.ad_id && a.compraron ? gs((a.gasto || 0) / a.compraron) : '—'}</td>
                    )}
                    {conGasto && (() => {
                      if (!a.ad_id) return <td style={num}>—</td>;
                      const r = (a.cobrado || 0) - (a.gasto || 0);
                      return (
                        <td style={{ ...num, fontWeight: 700, color: r > 0 ? '#047857' : r < 0 ? '#b91c1c' : 'var(--text-soft)' }}>
                          {r === 0 ? '—' : `${r > 0 ? '+' : '−'}${gs(Math.abs(r))}`}
                        </td>
                      );
                    })()}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {esAdmin && !meta?.conectado && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-gold, #e2e2e2)' }}>
          {!importando ? (
            <button
              type="button"
              onClick={() => { setImportando(true); setAviso(null); }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#4338ca', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}
            >
              {sinNombre > 0
                ? `Cargar los nombres de los anuncios (${sinNombre} sin nombre)`
                : 'Cargar nombres de anuncios desde el Administrador de anuncios'}
            </button>
          ) : (
            <form onSubmit={importar}>
              <div style={{ fontSize: '.76rem', color: 'var(--text-soft)', marginBottom: '6px', lineHeight: 1.5 }}>
                En el Administrador de anuncios, pestaña <b>Anuncios</b> → <b>Exportar</b> → exportar la tabla como CSV,
                y subí el archivo acá o pegá su contenido. Tiene que tener la columna “Identificador del anuncio”.
                También sirve pegar una línea por anuncio: el número y al lado el nombre.
              </div>
              <textarea
                id="anuncios-importar"
                rows={5}
                value={pegado}
                onChange={e => setPegado(e.target.value)}
                placeholder={'120212345678901234  CREATIVO A — CONTROL\n120212345678905678  CREATIVO B — EDUCACIÓN + DIVERSIÓN'}
                style={{ ...estiloCampo, width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '.76rem' }}
              />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                <label style={{ fontSize: '.76rem', color: '#4338ca', cursor: 'pointer', fontWeight: 600 }}>
                  Subir archivo CSV
                  <input id="anuncios-archivo" type="file" accept=".csv,.txt,.tsv,text/csv" onChange={leerArchivo} style={{ display: 'none' }} />
                </label>
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => { setImportando(false); setPegado(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-soft)', cursor: 'pointer', fontSize: '.78rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={trabajando || !pegado.trim()} style={{ padding: '6px 14px', fontSize: '.8rem' }}>
                  {trabajando ? 'Guardando…' : 'Guardar nombres'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

export default Anuncios;
