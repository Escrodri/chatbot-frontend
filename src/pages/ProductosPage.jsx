import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { productsService } from '../services/products.service';

// Límites de WhatsApp: si un mensaje se pasa, Meta lo rechaza entero.
const LIMITE_CON_BOTONES = 1024;
const LIMITE_TEXTO = 4096;
const LIMITE_BOTON = 20;
const MAX_PARTES = 3;

const MENSAJES_VACIOS = {
  presentacion: [''],
  boton_comprar: 'Lo quiero',
  boton_muestras: 'Ver muestras',
  muestras_intro: '',
  muestras_cierre: '',
  entrega: ''
};

const VARIABLES = [
  { clave: 'saludo', ayuda: 'Buen día, Buenas tardes o Buenas noches según la hora' },
  { clave: 'nombre', ayuda: 'Nombre de pila del cliente (si no lo tenemos, queda vacío)' },
  { clave: 'producto', ayuda: 'Nombre del producto' },
  { clave: 'precio_texto', ayuda: 'Precio de esa persona. Si tiene un descuento real agrega "(en vez de …)"' },
  { clave: 'precio', ayuda: 'Precio de esa persona' },
  { clave: 'precio_lista', ayuda: 'Precio normal' },
  { clave: 'links', ayuda: 'Link de entrega (solo en el mensaje de entrega)' }
];

const VACIO = {
  slug: '', name: '', description: '', price: '', currency: 'PYG',
  delivery_url: '', delivery_note: '', cover_url: '', is_active: true, sort_order: 0,
  precio_recuperacion: '', preview_urls: '', resumen: '',
  mensajes: MENSAJES_VACIOS
};

/** Lo que llega del backend, listo para el formulario (siempre al menos un mensaje). */
function mensajesParaEditar(m) {
  const e = m && typeof m === 'object' ? m : {};
  const presentacion = Array.isArray(e.presentacion) && e.presentacion.length
    ? e.presentacion.slice(0, MAX_PARTES)
    : [''];
  return {
    presentacion,
    boton_comprar: e.boton_comprar || MENSAJES_VACIOS.boton_comprar,
    boton_muestras: e.boton_muestras || MENSAJES_VACIOS.boton_muestras,
    muestras_intro: e.muestras_intro || '',
    muestras_cierre: e.muestras_cierre || '',
    entrega: e.entrega || ''
  };
}

/** Los mismos chequeos que hace el backend, para avisar antes de guardar. */
function erroresDeMensajes(m) {
  const errores = [];
  const partes = m.presentacion.map(t => t.trim()).filter(Boolean);
  partes.forEach((t, i) => {
    const conBotones = i === partes.length - 1;
    const tope = conBotones ? LIMITE_CON_BOTONES : LIMITE_TEXTO;
    if (t.length > tope) errores.push(`El mensaje ${i + 1} de la presentación pasa de ${tope} caracteres.`);
  });
  if (m.boton_comprar.trim().length > LIMITE_BOTON) errores.push(`El botón para comprar pasa de ${LIMITE_BOTON} caracteres.`);
  if (m.boton_muestras.trim().length > LIMITE_BOTON) errores.push(`El botón para ver muestras pasa de ${LIMITE_BOTON} caracteres.`);
  if (m.muestras_cierre.trim().length > LIMITE_CON_BOTONES) errores.push(`El texto después de las muestras pasa de ${LIMITE_CON_BOTONES} caracteres.`);
  return errores;
}

/** Igual que el backend: rellena variables y saca la coma que queda sin nombre. */
function renderizar(plantilla, vars) {
  let salida = String(plantilla || '');
  for (const { clave } of VARIABLES) {
    salida = salida.replace(new RegExp(`\\{\\{\\s*${clave}\\s*\\}\\}`, 'gi'), vars[clave] ?? '');
  }
  return salida.replace(/,\s*([!?.])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
}

/** *negrita* de WhatsApp, para que la vista previa se parezca a lo que llega. */
function conNegritas(texto) {
  return String(texto).split(/(\*[^*\n]+\*)/g).map((trozo, i) =>
    /^\*[^*\n]+\*$/.test(trozo) ? <strong key={i}>{trozo.slice(1, -1)}</strong> : trozo
  );
}

function Contador({ largo, tope }) {
  const color = largo > tope ? '#dc2626' : largo > tope * 0.85 ? '#b45309' : 'var(--text-soft)';
  return <span style={{ marginLeft: '8px', fontWeight: 400, color, fontVariantNumeric: 'tabular-nums' }}>{largo}/{tope}</span>;
}

/**
 * Catálogo de productos digitales.
 *
 * Se entra al listado, no al formulario: lo que uno hace la mayoría de las
 * veces es mirar qué hay y corregir un precio, no dar de alta algo nuevo. El
 * alta y la edición viven en un modal, que además evita la duda de "¿esto que
 * estoy viendo es un producto o el formulario vacío?".
 */
export function ProductosPage() {
  const { token } = useAuth();

  const [productos, setProductos] = useState([]);
  const [vistaPrevia, setVistaPrevia] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const archivoRef = useRef(null);

  // Las páginas de muestra suben por la misma tubería que la portada, pero con
  // su propio estado: si compartieran el de arriba, elegir una muestra dejaría
  // el botón de la portada diciendo "Subiendo…" sin razón.
  const [subiendoMuestra, setSubiendoMuestra] = useState(false);
  const muestrasRef = useRef(null);

  // Dónde va la variable que se toca: el último cuadro de mensaje enfocado.
  const [campoActivo, setCampoActivo] = useState('presentacion:0');

  // La lista vive como texto de varias líneas porque así la guarda el backend.
  // Acá se parte solo para pintar las miniaturas.
  const muestras = String(form.preview_urls || '').split('\n').map(u => u.trim()).filter(Boolean);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await productsService.list(token, { todos: true });
      setProductos(data.products || []);
      setVistaPrevia(data.catalog_text || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const campo = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const mensaje = (k, v) => setForm(prev => ({ ...prev, mensajes: { ...prev.mensajes, [k]: v } }));

  const parte = (i, v) => setForm(prev => {
    const presentacion = [...prev.mensajes.presentacion];
    presentacion[i] = v;
    return { ...prev, mensajes: { ...prev.mensajes, presentacion } };
  });

  const agregarParte = () => {
    const cantidad = form.mensajes.presentacion.length;
    if (cantidad >= MAX_PARTES) return;
    setForm(prev => ({
      ...prev,
      mensajes: { ...prev.mensajes, presentacion: [...prev.mensajes.presentacion, ''] }
    }));
    setCampoActivo(`presentacion:${cantidad}`);
  };

  const quitarParte = (i) => {
    setForm(prev => {
      const presentacion = prev.mensajes.presentacion.filter((_, j) => j !== i);
      return { ...prev, mensajes: { ...prev.mensajes, presentacion: presentacion.length ? presentacion : [''] } };
    });
    setCampoActivo('presentacion:0');
  };

  const insertarVariable = (clave) => {
    const token = `{{${clave}}}`;
    const unir = (actual) => (actual && !/\s$/.test(actual) ? `${actual} ${token}` : `${actual || ''}${token}`);
    if (campoActivo.startsWith('presentacion:')) {
      const i = Number(campoActivo.split(':')[1]) || 0;
      parte(i, unir(form.mensajes.presentacion[i]));
    } else {
      mensaje(campoActivo, unir(form.mensajes[campoActivo]));
    }
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    // La posición por defecto manda el producto al final de la lista.
    setForm({ ...VACIO, sort_order: productos.length });
    setCampoActivo('presentacion:0');
    setError(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (p) => {
    setEditandoId(p.id);
    setForm({
      slug: p.slug || '',
      name: p.name || '',
      description: p.description || '',
      price: String(p.price ?? ''),
      currency: p.currency || 'PYG',
      delivery_url: p.delivery_url || '',
      delivery_note: p.delivery_note || '',
      cover_url: p.cover_url || '',
      resumen: p.resumen || '',
      precio_recuperacion: p.precio_recuperacion ?? '',
      preview_urls: Array.isArray(p.preview_urls) ? p.preview_urls.join('\n') : (p.preview_urls || ''),
      is_active: p.is_active !== false,
      sort_order: p.sort_order || 0,
      mensajes: mensajesParaEditar(p.mensajes)
    });
    setCampoActivo('presentacion:0');
    setError(null);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditandoId(null);
    setForm(VACIO);
  };

  const elegirImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen supera los 5 MB. Usá una más liviana.');
      return;
    }

    setSubiendo(true);
    setError(null);
    try {
      const { url } = await productsService.subirImagen(token, file);
      campo('cover_url', url);
    } catch (err) {
      setError('No se pudo subir la imagen: ' + err.message);
    } finally {
      setSubiendo(false);
      if (archivoRef.current) archivoRef.current.value = '';
    }
  };

  /**
   * Sube una página de muestra y la agrega a la lista.
   *
   * Pedirle a alguien que consiga una URL pública para cada imagen era pedirle
   * que hiciera a mano el trabajo que el sistema ya sabe hacer: la portada se
   * sube eligiendo un archivo desde hace rato, y no había ninguna razón para
   * que estas fueran distintas.
   */
  const elegirMuestra = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen supera los 5 MB. Usá una más liviana.');
      return;
    }

    if (muestras.length >= 3) {
      setError('Con tres muestras alcanza. El que ya vio todo el material no tiene nada que comprar.');
      return;
    }

    setSubiendoMuestra(true);
    setError(null);
    try {
      const { url } = await productsService.subirImagen(token, file);
      campo('preview_urls', [...muestras, url].join('\n'));
    } catch (err) {
      setError('No se pudo subir la imagen: ' + err.message);
    } finally {
      setSubiendoMuestra(false);
      if (muestrasRef.current) muestrasRef.current.value = '';
    }
  };

  const quitarMuestra = (url) => {
    campo('preview_urls', muestras.filter(u => u !== url).join('\n'));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Poné un nombre.'); return; }
    if (!form.slug.trim()) { setError('Poné un identificador (slug).'); return; }

    const errores = erroresDeMensajes(form.mensajes);
    if (errores.length) { setError(errores.join(' ')); return; }

    setGuardando(true);
    setError(null);
    try {
      const cuerpo = {
        ...form,
        price: Number(form.price) || 0,
        sort_order: Number(form.sort_order) || 0,
        mensajes: {
          ...form.mensajes,
          presentacion: form.mensajes.presentacion.map(t => t.trim()).filter(Boolean)
        }
      };
      if (editandoId) await productsService.update(token, editandoId, cuerpo);
      else await productsService.create(token, cuerpo);
      cerrarModal();
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async (p) => {
    const ok = window.confirm(
      `¿Sacar "${p.name}" del catálogo?\n\n` +
      'Deja de ofrecerse y el bot no lo va a cotizar más, pero las ventas ya hechas se conservan.'
    );
    if (!ok) return;
    try {
      await productsService.desactivar(token, p.id);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const reactivar = async (p) => {
    try {
      await productsService.update(token, p.id, { is_active: true });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const input = {
    width: '100%', padding: '9px 11px', borderRadius: '8px',
    border: '1px solid var(--border-gold, #ddd)', fontSize: '.9rem',
    background: 'var(--bg-card, #fff)', color: 'inherit', boxSizing: 'border-box'
  };
  const label = { display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-soft)' };
  const ayuda = { display: 'block', marginTop: '4px', color: 'var(--text-soft)', fontSize: '.74rem', lineHeight: 1.4 };

  const btnPrimario = {
    padding: '10px 18px', borderRadius: '8px', border: 'none',
    background: 'var(--wa-teal, #00a884)', color: '#fff',
    fontWeight: 600, fontSize: '.88rem', cursor: 'pointer', whiteSpace: 'nowrap'
  };
  const btnSecundario = {
    padding: '6px 12px', borderRadius: '6px', fontSize: '.8rem',
    border: '1px solid var(--border-gold, #ddd)', background: 'transparent',
    color: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap'
  };

  return (
    <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '28px 20px 60px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.6rem' }}>Productos</h2>
          <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '.92rem', maxWidth: '58ch' }}>
            Esto es lo que el bot cotiza por WhatsApp. Cambiás un precio acá y lo usa
            en la próxima conversación, sin tocar nada más.
          </p>
        </div>
        <button type="button" style={btnPrimario} onClick={abrirNuevo}>
          Agregar producto
        </button>
      </header>

      {error && !modalAbierto && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,.12)', color: '#b91c1c', marginBottom: '18px', fontSize: '.88rem' }}>
          {error}
        </div>
      )}

      {/* Listado */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px', background: 'var(--bg-card, #fff)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: '680px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft, #fafafa)', textAlign: 'left' }}>
              <th style={{ padding: '11px 14px', fontWeight: 600, width: '54px' }}></th>
              <th style={{ padding: '11px 14px', fontWeight: 600 }}>Producto</th>
              <th style={{ padding: '11px 14px', fontWeight: 600, textAlign: 'right' }}>Precio</th>
              <th style={{ padding: '11px 14px', fontWeight: 600 }}>Estado</th>
              <th style={{ padding: '11px 14px', fontWeight: 600 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={5} style={{ padding: '30px 14px', textAlign: 'center', color: 'var(--text-soft)' }}>Cargando…</td></tr>
            )}

            {!cargando && productos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '34px 14px', textAlign: 'center', color: 'var(--text-soft)' }}>
                  Todavía no hay productos. Agregá el primero para que el bot tenga algo que ofrecer.
                </td>
              </tr>
            )}

            {productos.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--border-gold, #eee)', opacity: p.is_active ? 1 : 0.6 }}>
                <td style={{ padding: '10px 14px' }}>
                  {p.cover_url ? (
                    <img
                      src={p.cover_url}
                      alt=""
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', display: 'block' }}
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--bg-soft, #f0f0f0)' }} />
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: 'var(--text-soft)', fontSize: '.78rem' }}>
                    {p.description ? (p.description.length > 70 ? p.description.slice(0, 70) + '…' : p.description) : p.slug}
                  </div>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {p.price_formatted || productsService.formatearPrecio(p.price, p.currency)}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    fontSize: '.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '5px',
                    color: p.is_active ? '#047857' : '#6b7280',
                    background: p.is_active ? 'rgba(16,185,129,.16)' : 'rgba(107,114,128,.14)'
                  }}>
                    {p.is_active ? 'En catálogo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button type="button" style={btnSecundario} onClick={() => abrirEdicion(p)}>Editar</button>
                    {p.is_active ? (
                      <button
                        type="button"
                        style={{ ...btnSecundario, borderColor: '#b91c1c33', color: '#b91c1c' }}
                        onClick={() => desactivar(p)}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button type="button" style={btnSecundario} onClick={() => reactivar(p)}>Reactivar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista previa del mensaje */}
      {productos.length > 0 && (
        <section style={{ marginTop: '26px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem' }}>Así lo ve el cliente</h3>
          <p style={{ margin: '0 0 12px', fontSize: '.82rem', color: 'var(--text-soft)' }}>
            El mensaje exacto que manda el bot cuando alguien pregunta por precios.
            El orden de los productos es el que definís en cada uno.
          </p>
          <div style={{
            background: '#dcf8c6', color: '#111', borderRadius: '10px', padding: '13px 15px',
            fontSize: '.86rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, maxWidth: '460px'
          }}>
            {vistaPrevia}
          </div>
        </section>
      )}

      {/* Modal de alta / edición */}
      {modalAbierto && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '40px 16px', overflowY: 'auto', zIndex: 1000
          }}
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <form
            onSubmit={guardar}
            style={{
              background: 'var(--bg-card, #fff)', borderRadius: '12px', padding: '22px',
              width: '100%', maxWidth: '560px', boxShadow: '0 12px 40px rgba(0,0,0,.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                {editandoId ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button type="button" onClick={cerrarModal}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-soft)', lineHeight: 1 }}>
                ×
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 13px', borderRadius: '7px', background: 'rgba(239,68,68,.12)', color: '#b91c1c', marginBottom: '16px', fontSize: '.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={label} htmlFor="p-name">Nombre</label>
              <input id="p-name" style={input} value={form.name}
                onChange={(e) => campo('name', e.target.value)}
                placeholder="Nombre del producto, como lo va a ver el cliente" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label} htmlFor="p-slug">Identificador</label>
              <input id="p-slug" style={input} value={form.slug}
                onChange={(e) => campo('slug', e.target.value)}
                placeholder="nombre-corto-sin-espacios" />
              <small style={ayuda}>
                Un nombre corto sin espacios, para uso interno. El cliente nunca lo ve.
              </small>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label} htmlFor="p-desc">Descripción</label>
              <textarea id="p-desc" rows={2} style={{ ...input, resize: 'vertical' }} value={form.description}
                onChange={(e) => campo('description', e.target.value)}
                placeholder="Qué es, para quién es y qué trae." />
              <small style={ayuda}>
                La descripción completa. La usa la IA para contestar preguntas y aparece en la lista de precios.
              </small>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label} htmlFor="p-resumen">
                Resumen corto
                <Contador largo={(form.resumen || '').length} tope={LIMITE_CON_BOTONES} />
              </label>
              <textarea id="p-resumen" rows={3} style={{ ...input, resize: 'vertical' }}
                value={form.resumen}
                onChange={(e) => campo('resumen', e.target.value)}
                placeholder="Dos o tres líneas con lo principal del producto." />
              <small style={ayuda}>
                Respaldo: el bot lo usa solo si todavía no cargaste los mensajes de presentación de más abajo.
              </small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={label} htmlFor="p-price">Precio</label>
                <input id="p-price" type="number" min="0" style={input} value={form.price}
                  onChange={(e) => campo('price', e.target.value)} placeholder="35000" />
              </div>
              <div>
                <label style={label} htmlFor="p-cur">Moneda</label>
                <select id="p-cur" style={input} value={form.currency} onChange={(e) => campo('currency', e.target.value)}>
                  <option value="PYG">PYG</option>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
            </div>

            {/* Portada */}
            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Imagen de portada</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {form.cover_url ? (
                  <img src={form.cover_url} alt="Portada"
                    style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-gold, #ddd)' }} />
                ) : (
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '8px',
                    background: 'var(--bg-soft, #f2f2f2)', border: '1px dashed var(--border-gold, #ddd)'
                  }} />
                )}

                <div style={{ flex: 1 }}>
                  <input ref={archivoRef} type="file" accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }} onChange={elegirImagen} />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" style={btnSecundario} disabled={subiendo}
                      onClick={() => archivoRef.current?.click()}>
                      {subiendo ? 'Subiendo…' : (form.cover_url ? 'Cambiar imagen' : 'Elegir imagen')}
                    </button>
                    {form.cover_url && (
                      <button type="button" style={btnSecundario} onClick={() => campo('cover_url', '')}>
                        Quitar
                      </button>
                    )}
                  </div>
                  <small style={ayuda}>
                    JPG, PNG o WebP, hasta 5 MB. Es la que el bot manda después de la bienvenida.
                  </small>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label} htmlFor="p-entrega">Link de entrega</label>
              <input id="p-entrega" style={input} value={form.delivery_url}
                onChange={(e) => campo('delivery_url', e.target.value)}
                placeholder="https://drive.google.com/..." />
              <small style={ayuda}>
                El enlace al archivo. No viaja en el catálogo: el backend solo lo entrega
                cuando el pedido está pagado.
              </small>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label} htmlFor="p-precio-rec">Precio de recuperación</label>
              <input id="p-precio-rec" type="number" min="0" style={{ ...input, maxWidth: '160px' }}
                value={form.precio_recuperacion}
                onChange={(e) => campo('precio_recuperacion', e.target.value)}
                placeholder="15000" />
              <small style={ayuda}>
                El precio con el que el bot le insiste a quien se quedó a mitad de camino, varias
                horas después. Dejalo vacío y no hay descuento: sigue insistiendo al precio de
                siempre. Conviene vaciarlo cada tanto — un descuento que está siempre se aprende,
                y esperar termina saliendo gratis.
              </small>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Páginas de muestra</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '8px' }}>
                {muestras.map((url) => (
                  <div key={url} style={{ position: 'relative' }}>
                    <img src={url} alt="Muestra"
                      style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-gold, #ddd)' }} />
                    <button type="button" onClick={() => quitarMuestra(url)} title="Quitar"
                      style={{
                        position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px',
                        borderRadius: '50%', border: '1px solid var(--border-gold, #ddd)', background: '#fff',
                        color: '#b91c1c', cursor: 'pointer', lineHeight: 1, fontSize: '.8rem', padding: 0
                      }}>×</button>
                  </div>
                ))}

                {muestras.length < 3 && (
                  <button type="button" disabled={subiendoMuestra}
                    onClick={() => muestrasRef.current?.click()}
                    style={{
                      width: '64px', height: '64px', borderRadius: '8px', cursor: 'pointer',
                      border: '1px dashed var(--border-gold, #ccc)', background: 'transparent',
                      color: 'var(--text-soft, #888)', fontSize: '.7rem', lineHeight: 1.2
                    }}>
                    {subiendoMuestra ? '…' : '+ Agregar'}
                  </button>
                )}
              </div>

              <input ref={muestrasRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={elegirMuestra} />

              <small style={ayuda}>
                Son las que manda el bot cuando tocan "VER PÁGINAS". Dos o tres alcanzan:
                quien ya vio todo el material no tiene nada que comprar.
              </small>
            </div>

            {/* Mensajes del bot */}
            <section style={{ margin: '4px 0 18px', padding: '14px', border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '.98rem' }}>Mensajes del bot</h4>
              <p style={{ ...ayuda, marginTop: 0, marginBottom: '10px' }}>
                Lo que el bot le manda al cliente sobre este producto. No está en el código: lo que
                guardes acá es lo que recibe el próximo cliente.
              </p>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {VARIABLES.map(v => (
                  <button key={v.clave} type="button" title={v.ayuda} onClick={() => insertarVariable(v.clave)}
                    style={{ ...btnSecundario, padding: '3px 8px', fontSize: '.74rem', fontFamily: 'monospace' }}>
                    {`{{${v.clave}}}`}
                  </button>
                ))}
              </div>

              {/* Presentación */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '.84rem', fontWeight: 700, marginBottom: '6px' }}>Presentación</div>
                <small style={{ ...ayuda, marginTop: 0, marginBottom: '8px' }}>
                  Primero sale la portada (si cargaste una) y después estos mensajes, en orden y con unos
                  segundos entre uno y otro. El último lleva los botones.
                </small>
                {form.mensajes.presentacion.map((t, i, lista) => {
                  const ultimo = i === lista.length - 1;
                  const tope = ultimo ? LIMITE_CON_BOTONES : LIMITE_TEXTO;
                  return (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={label} htmlFor={`p-msg-${i}`}>
                          Mensaje {i + 1}{ultimo ? ' · sale con los botones' : ''}
                          <Contador largo={t.length} tope={tope} />
                        </label>
                        {lista.length > 1 && (
                          <button type="button" onClick={() => quitarParte(i)}
                            style={{ ...btnSecundario, padding: '2px 8px', fontSize: '.72rem', color: '#b91c1c' }}>
                            Quitar
                          </button>
                        )}
                      </div>
                      <textarea id={`p-msg-${i}`} rows={ultimo ? 4 : 5} style={{ ...input, resize: 'vertical' }}
                        value={t}
                        onFocus={() => setCampoActivo(`presentacion:${i}`)}
                        onChange={(e) => parte(i, e.target.value)}
                        placeholder={i === 0 ? '¡{{saludo}}, {{nombre}}! …' : (ultimo ? '💰 Precio: {{precio_texto}} …' : '')} />
                    </div>
                  );
                })}
                {form.mensajes.presentacion.length < MAX_PARTES && (
                  <button type="button" style={{ ...btnSecundario, fontSize: '.78rem' }} onClick={agregarParte}>
                    + Agregar mensaje
                  </button>
                )}
              </div>

              {/* Botones */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={label} htmlFor="p-btn-comprar">
                    Botón para comprar
                    <Contador largo={form.mensajes.boton_comprar.length} tope={LIMITE_BOTON} />
                  </label>
                  <input id="p-btn-comprar" style={input} value={form.mensajes.boton_comprar}
                    onChange={(e) => mensaje('boton_comprar', e.target.value)} />
                </div>
                <div>
                  <label style={label} htmlFor="p-btn-muestras">
                    Botón para ver muestras
                    <Contador largo={form.mensajes.boton_muestras.length} tope={LIMITE_BOTON} />
                  </label>
                  <input id="p-btn-muestras" style={input} value={form.mensajes.boton_muestras}
                    onChange={(e) => mensaje('boton_muestras', e.target.value)} />
                  <small style={ayuda}>Solo aparece si el producto tiene páginas de muestra.</small>
                </div>
              </div>

              {/* Muestras */}
              <div style={{ marginBottom: '14px' }}>
                <label style={label} htmlFor="p-muestras-intro">Antes de las páginas de muestra (opcional)</label>
                <textarea id="p-muestras-intro" rows={2} style={{ ...input, resize: 'vertical' }}
                  value={form.mensajes.muestras_intro}
                  onFocus={() => setCampoActivo('muestras_intro')}
                  onChange={(e) => mensaje('muestras_intro', e.target.value)} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={label} htmlFor="p-muestras-cierre">
                  Después de las páginas de muestra · sale con el botón de comprar
                  <Contador largo={form.mensajes.muestras_cierre.length} tope={LIMITE_CON_BOTONES} />
                </label>
                <textarea id="p-muestras-cierre" rows={3} style={{ ...input, resize: 'vertical' }}
                  value={form.mensajes.muestras_cierre}
                  onFocus={() => setCampoActivo('muestras_cierre')}
                  onChange={(e) => mensaje('muestras_cierre', e.target.value)} />
                <small style={ayuda}>Si lo dejás vacío sale el nombre del producto con el precio.</small>
              </div>

              {/* Entrega */}
              <div style={{ marginBottom: '16px' }}>
                <label style={label} htmlFor="p-entrega-msg">
                  Mensaje de entrega
                  <Contador largo={form.mensajes.entrega.length} tope={LIMITE_TEXTO} />
                </label>
                <textarea id="p-entrega-msg" rows={4} style={{ ...input, resize: 'vertical' }}
                  value={form.mensajes.entrega}
                  onFocus={() => setCampoActivo('entrega')}
                  onChange={(e) => mensaje('entrega', e.target.value)}
                  placeholder={'¡Listo, {{nombre}}! Acá tenés {{producto}}:\n{{links}}'} />
                <small style={ayuda}>
                  Sale cuando se confirma el pago. Usá {'{{links}}'} donde va el link; si no lo ponés, se agrega al final.
                  Si lo dejás vacío sale un mensaje corto con el nombre del producto y el link.
                </small>
              </div>

              {/* Vista previa */}
              {(() => {
                const precio = productsService.formatearPrecio(Number(form.price) || 0, form.currency);
                const vars = {
                  saludo: 'Buen día', nombre: 'María', producto: form.name || 'Tu producto',
                  precio, precio_lista: precio, precio_texto: precio, links: form.delivery_url || ''
                };
                const partes = form.mensajes.presentacion.map(t => t.trim()).filter(Boolean);
                const botones = [
                  ...(muestras.length ? [form.mensajes.boton_muestras || MENSAJES_VACIOS.boton_muestras] : []),
                  form.mensajes.boton_comprar || MENSAJES_VACIOS.boton_comprar
                ];
                const burbuja = {
                  background: '#dcf8c6', color: '#111', borderRadius: '10px', padding: '9px 11px',
                  fontSize: '.82rem', whiteSpace: 'pre-wrap', lineHeight: 1.45, maxWidth: '420px'
                };
                return (
                  <div>
                    <div style={{ fontSize: '.84rem', fontWeight: 700, marginBottom: '6px' }}>
                      Vista previa de la presentación
                      <span style={{ fontWeight: 400, color: 'var(--text-soft)', fontSize: '.74rem', marginLeft: '6px' }}>
                        (con "María" y el precio de lista)
                      </span>
                    </div>
                    {partes.length === 0 ? (
                      <small style={ayuda}>Escribí al menos un mensaje de presentación para verlo acá.</small>
                    ) : (
                      <div style={{ display: 'grid', gap: '6px', background: 'var(--bg-soft, #efeae2)', padding: '10px', borderRadius: '10px' }}>
                        {form.cover_url && (
                          <img src={form.cover_url} alt="Portada"
                            style={{ width: '140px', borderRadius: '8px', display: 'block' }} />
                        )}
                        {partes.map((t, i) => (
                          <div key={i} style={burbuja}>
                            {conNegritas(renderizar(t, vars))}
                            {i === partes.length - 1 && (
                              <div style={{ display: 'grid', gap: '4px', marginTop: '8px' }}>
                                {botones.map((b, j) => (
                                  <div key={j} style={{ textAlign: 'center', padding: '6px', borderTop: '1px solid rgba(0,0,0,.08)', color: '#027eb5', fontWeight: 600 }}>
                                    {b}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>

            <div style={{ marginBottom: '16px' }}>
              <label style={label} htmlFor="p-orden">Posición en el catálogo</label>
              <input id="p-orden" type="number" style={{ ...input, maxWidth: '120px' }} value={form.sort_order}
                onChange={(e) => campo('sort_order', e.target.value)} />
              <small style={ayuda}>
                Decide en qué orden los lista el bot: el número más bajo aparece primero.
                Si te da igual, dejalo como está.
              </small>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.88rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => campo('is_active', e.target.checked)} />
                Activo: el bot lo ofrece en el catálogo
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" style={btnSecundario} onClick={cerrarModal}>Cancelar</button>
              <button type="submit" style={btnPrimario} disabled={guardando || subiendo}>
                {guardando ? 'Guardando…' : (editandoId ? 'Guardar cambios' : 'Crear producto')}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default ProductosPage;
