import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { campanasService } from '../../services/campanas.service';
import { productsService } from '../../services/products.service';
import { MensajesRemarketing } from './MensajesRemarketing';

/**
 * Campañas de precio: remarketing y promos con fecha.
 *
 * Existe para que un precio especial deje de ser algo que "sabe" el bot y
 * pase a ser algo escrito: cuánto, para qué producto, desde y hasta cuándo, y
 * a quién. Con eso el sistema puede mirar un comprobante de 15.000 y saber si
 * es un pago completo (la persona llegó por la promo) o uno a medias (no).
 *
 * Dos alcances, y la diferencia importa:
 *
 *   Solo invitados — la reciben los que llegan tocando el anuncio (por su id)
 *   o escribiendo la palabra clave. Es lo que corresponde al remarketing: la
 *   promo es para quien ya pasó y no compró, no para el que escribe por
 *   primera vez.
 *
 *   Todos — la recibe cualquiera que pague mientras dure. Sirve para una
 *   promo pública, o para un envío masivo desde WhatsApp donde el sistema no
 *   sabe a quién le llegó.
 */

const ESTADO = {
  en_curso:   { texto: 'En curso',   color: '#047857', fondo: 'rgba(16,185,129,.14)' },
  programada: { texto: 'Programada', color: '#1d4ed8', fondo: 'rgba(59,130,246,.13)' },
  terminada:  { texto: 'Terminada',  color: '#6b7280', fondo: 'rgba(107,114,128,.14)' },
  apagada:    { texto: 'Apagada',    color: '#b91c1c', fondo: 'rgba(239,68,68,.12)' }
};

/** "2026-10-07T23:59" para el campo de fecha del navegador, en hora de Paraguay. */
function paraCampo(fecha) {
  const d = new Date(new Date(fecha).getTime() - 3 * 3600000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function vacia() {
  const ahora = Date.now();
  return {
    nombre: '',
    product_id: '',
    precio: '',
    desde: paraCampo(ahora),
    hasta: paraCampo(ahora + 7 * 24 * 3600000),
    alcance: 'invitados',
    anuncios: '',
    palabra_clave: '',
    gracia_horas: 24
  };
}

const estiloCampo = {
  width: '100%', marginTop: '3px', padding: '7px 9px', borderRadius: '7px',
  border: '1px solid var(--border-gold, #ddd)', fontSize: '.84rem',
  background: 'var(--bg-panel, transparent)', color: 'inherit', boxSizing: 'border-box'
};
const estiloEtiqueta = { display: 'block', fontSize: '.74rem', color: 'var(--text-soft)' };

export function Campanas() {
  const { token, user } = useAuth();
  const esAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [campanas, setCampanas] = useState(null);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(vacia);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const [cs, ps] = await Promise.all([
        campanasService.listar(token),
        productsService.list(token).catch(() => [])
      ]);
      setCampanas(cs);
      setProductos(Array.isArray(ps) ? ps : (ps?.products || []));
    } catch (e) {
      setError(e.message);
      setCampanas([]);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const producto = productos.find(p => String(p.id) === String(form.product_id));

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      await campanasService.crear(token, { ...form, product_id: Number(form.product_id) });
      setAviso({ ok: true, texto: `Campaña "${form.nombre}" creada.` });
      setForm(vacia());
      setAbierto(false);
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(c) {
    setAviso(null);
    try {
      await campanasService.cambiar(token, c.id, { activa: !c.activa });
      setAviso({ ok: true, texto: c.activa ? `"${c.nombre}" apagada. Deja de dar precio, también a los que ya habían entrado.` : `"${c.nombre}" encendida.` });
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    }
  }

  const campo = (clave, etiqueta, props = {}) => (
    <label style={estiloEtiqueta}>
      {etiqueta}
      <input
        id={`campana-${clave}`}
        value={form[clave]}
        onChange={(e) => setForm(f => ({ ...f, [clave]: e.target.value }))}
        style={estiloCampo}
        {...props}
      />
    </label>
  );

  const enCurso = (campanas || []).filter(c => c.estado === 'en_curso');

  return (
    <section style={{
      border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px',
      padding: '12px 14px', marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '.86rem', fontWeight: 700 }}>Campañas de precio</div>
          <div style={{ fontSize: '.79rem', color: 'var(--text-soft)', lineHeight: 1.4 }}>
            {campanas === null
              ? 'Leyendo…'
              : enCurso.length
                ? `${enCurso.length} en curso: ${enCurso.map(c => `${c.nombre} (${c.precio_formateado} hasta el ${c.hasta_texto})`).join(' · ')}`
                : 'Ninguna en curso. Todos pagan el precio de lista, salvo el descuento del seguimiento.'}
          </div>
        </div>
        {esAdmin && (
          <button type="button" className="btn-card-action" onClick={() => { setAbierto(a => !a); setAviso(null); }}>
            {abierto ? 'Cancelar' : 'Nueva campaña'}
          </button>
        )}
      </div>

      {error && (
        <p style={{ margin: '9px 0 0', fontSize: '.78rem', color: '#b91c1c' }}>
          {/404|not found/i.test(error)
            ? 'El servidor todavía no tiene las campañas. Desplegá la versión nueva del backend.'
            : error}
        </p>
      )}

      {aviso && (
        <p style={{ margin: '9px 0 0', fontSize: '.78rem', color: aviso.ok ? '#047857' : '#b91c1c' }}>{aviso.texto}</p>
      )}

      {abierto && esAdmin && (
        <form onSubmit={guardar} style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
            {campo('nombre', 'Nombre', { placeholder: 'Remarketing octubre', required: true })}
            <label style={estiloEtiqueta}>
              Producto
              <select
                id="campana-product_id"
                value={form.product_id}
                onChange={(e) => setForm(f => ({ ...f, product_id: e.target.value }))}
                style={estiloCampo}
                required
              >
                <option value="">Elegí…</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.price_formatted || p.price})</option>
                ))}
              </select>
            </label>
            {campo('precio', `Precio de la campaña${producto ? ` (lista: ${producto.price_formatted || producto.price})` : ''}`, { placeholder: '15.000', inputMode: 'numeric', required: true })}
            {campo('desde', 'Empieza (hora de Paraguay)', { type: 'datetime-local', required: true })}
            {campo('hasta', 'Termina (hora de Paraguay)', { type: 'datetime-local', required: true })}
            {campo('gracia_horas', 'Tolerancia después del fin (horas)', { type: 'number', min: 0, max: 168 })}
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: '6px' }}>
            <legend style={{ ...estiloEtiqueta, marginBottom: '4px' }}>¿Quién recibe este precio?</legend>
            {[
              ['invitados', 'Solo los que llegan por el anuncio o escriben la palabra clave', 'Para remarketing: la promo es para quien ya pasó y no compró.'],
              ['todos', 'Todos los que paguen mientras dure', 'Para una promo pública o un envío masivo desde WhatsApp.']
            ].map(([valor, titulo, ayuda]) => (
              <label key={valor} style={{
                display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '.82rem', cursor: 'pointer',
                padding: '8px 10px', borderRadius: '8px',
                border: `1px solid ${form.alcance === valor ? '#04785755' : 'var(--border-gold, #e2e2e2)'}`
              }}>
                <input
                  id={`campana-alcance-${valor}`}
                  type="radio"
                  name="alcance"
                  checked={form.alcance === valor}
                  onChange={() => setForm(f => ({ ...f, alcance: valor }))}
                  style={{ marginTop: '3px' }}
                />
                <span><strong>{titulo}</strong><br /><span style={{ color: 'var(--text-soft)', fontSize: '.76rem' }}>{ayuda}</span></span>
              </label>
            ))}
          </fieldset>

          {form.alcance === 'invitados' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <label style={estiloEtiqueta}>
                Id de los anuncios (uno por línea)
                <textarea
                  id="campana-anuncios"
                  value={form.anuncios}
                  onChange={(e) => setForm(f => ({ ...f, anuncios: e.target.value }))}
                  rows={3}
                  placeholder={'120210000000000001\n120210000000000002'}
                  style={{ ...estiloCampo, fontFamily: 'ui-monospace, Menlo, monospace', resize: 'vertical' }}
                />
                <span style={{ fontSize: '.72rem' }}>En el Administrador de anuncios: columna "Identificador del anuncio".</span>
              </label>
              <label style={estiloEtiqueta}>
                Palabra clave (opcional)
                <input
                  id="campana-palabra_clave"
                  value={form.palabra_clave}
                  onChange={(e) => setForm(f => ({ ...f, palabra_clave: e.target.value }))}
                  placeholder="PROMO15"
                  style={estiloCampo}
                />
                <span style={{ fontSize: '.72rem' }}>Ponela en el mensaje que el anuncio deja escrito. Cualquiera que la escriba entra.</span>
              </label>
            </div>
          )}

          <div>
            <button type="submit" className="btn-card-action" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Crear campaña'}
            </button>
          </div>
        </form>
      )}

      {campanas && campanas.length > 0 && (
        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          {campanas.map(c => {
            const e = ESTADO[c.estado] || ESTADO.terminada;
            return (
              <div key={c.id} style={{
                display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
                padding: '9px 11px', borderRadius: '8px', border: '1px solid var(--border-gold, #e2e2e2)'
              }}>
                <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', color: e.color, background: e.fondo }}>
                  {e.texto}
                </span>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '.84rem', fontWeight: 600 }}>
                    {c.nombre} · {c.precio_formateado} <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}>(lista Gs. {Number(c.product_price).toLocaleString('es-PY')})</span>
                  </div>
                  <div style={{ fontSize: '.76rem', color: 'var(--text-soft)', lineHeight: 1.45 }}>
                    {c.product_name} · del {c.desde_texto} al {c.hasta_texto}
                    {c.gracia_horas ? ` (+${c.gracia_horas} h de tolerancia)` : ''} ·{' '}
                    {c.alcance === 'todos'
                      ? 'para todos'
                      : `por ${[c.anuncios ? `${c.anuncios.split(',').length} anuncio(s)` : null, c.palabra_clave ? `"${c.palabra_clave}"` : null].filter(Boolean).join(' o ')}`}
                  </div>
                </div>
                <div style={{ fontSize: '.76rem', color: 'var(--text-soft)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {c.alcance === 'invitados' ? `${c.personas} persona(s) · ` : ''}{c.ventas} venta(s)
                  {c.recaudado ? ` · Gs. ${Number(c.recaudado).toLocaleString('es-PY')}` : ''}
                </div>
                {esAdmin && c.estado !== 'terminada' && (
                  <button type="button" className="btn-card-action" onClick={() => alternar(c)}>
                    {c.activa ? 'Apagar' : 'Encender'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MensajesRemarketing />
    </section>
  );
}

export default Campanas;
