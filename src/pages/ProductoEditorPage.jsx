import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productsService } from '../services/products.service';
import { recoveryMessagesService } from '../services/recovery-messages.service';
import { ordersService } from '../services/orders.service';
import { VistaWhatsApp } from '../components/productos/VistaWhatsApp';
import { CampoMensaje, CampoBoton } from '../components/productos/CampoMensaje';
import {
  LIMITES,
  CLAVES_SEGUIMIENTO,
  EXTRA_POR_DEFECTO,
  PAGO_POR_DEFECTO,
  ENTREGA_POR_DEFECTO,
  BOTONES_POR_DEFECTO,
  renderizar,
  formatearPrecio,
  linksDe,
  linkValido,
  bloqueLinks,
  bloqueCuenta,
  revisarProducto,
  variablesDesconocidas
} from '../lib/productoTextos';
import { marcarCambiosSinGuardar, puedeSalir } from '../lib/cambiosSinGuardar';
import '../productos.css';

/**
 * Pantalla de un producto: todo lo que el bot hace para venderlo, en el
 * orden en que lo vive el cliente.
 *
 * Reemplaza al modal. En el modal un clic afuera o un Escape tiraba todo lo
 * escrito, y los mensajes de seguimiento vivían en otra pantalla (Pedidos →
 * Campañas) y eran los mismos para todos los productos. Acá cada producto
 * tiene sus siete pasos, cada uno con su vista previa al lado.
 */

const PASOS = [
  { id: 'producto', titulo: 'Producto', bajada: 'Nombre, precio y portada' },
  { id: 'presentacion', titulo: 'Presentación', bajada: 'Lo primero que recibe' },
  { id: 'muestras', titulo: 'Muestras', bajada: 'Si toca "Ver muestras"' },
  { id: 'extra', titulo: 'Extra al comprar', bajada: 'Order bump, opcional' },
  { id: 'pago', titulo: 'Datos de pago', bajada: 'Cuenta y total' },
  { id: 'entrega', titulo: 'Entrega', bajada: 'Links al confirmar el pago' },
  { id: 'seguimiento', titulo: 'Seguimiento', bajada: 'Si no termina de comprar' }
];

/** Los pasos que no aplican a un producto que solo se vende como extra. */
const NO_APLICAN_A_EXTRA = ['presentacion', 'muestras', 'extra', 'pago', 'seguimiento'];

const NIVELES = [
  {
    nivel: 1,
    claves: [
      { clave: 'nivel_1_mirando', titulo: 'Si solo miró el producto' },
      { clave: 'nivel_1_decidido', titulo: 'Si ya tocó comprar o recibió los datos' }
    ]
  },
  {
    nivel: 2,
    claves: [
      { clave: 'nivel_2_mirando', titulo: 'Con descuento · si solo miró', descuento: true },
      { clave: 'nivel_2_decidido', titulo: 'Con descuento · si ya tocó comprar', descuento: true },
      { clave: 'nivel_2_sin_descuento', titulo: 'Sin descuento' }
    ]
  },
  {
    nivel: 3,
    claves: [
      { clave: 'nivel_3', titulo: 'Con descuento', descuento: true },
      { clave: 'nivel_3_sin_descuento', titulo: 'Sin descuento' }
    ]
  }
];

const MINUTOS_POR_DEFECTO = [120, 480, 1200];

function horas(minutos) {
  const h = Number(minutos) / 60;
  return Number.isInteger(h) ? `${h} h` : `${Math.round(Number(minutos))} min`;
}

/** Un formulario vacío, con los textos que conviene tener escritos de entrada. */
function formularioNuevo(base) {
  return {
    name: '',
    slug: '',
    description: '',
    resumen: '',
    price: '',
    currency: 'PYG',
    cover_url: '',
    is_active: true,
    sort_order: 0,
    solo_extra: false,
    delivery_note: '',
    precio_recuperacion: '',
    preview_urls: [],
    entregables: [{ etiqueta: '', url: '' }],
    mensajes: {
      presentacion: [''],
      boton_comprar: BOTONES_POR_DEFECTO.comprar,
      boton_muestras: BOTONES_POR_DEFECTO.muestras,
      muestras_intro: '',
      muestras_cierre: '',
      pago: '',
      entrega: ENTREGA_POR_DEFECTO,
      seguimiento: {
        activo: true,
        textos: Object.fromEntries(CLAVES_SEGUIMIENTO.map(k => [k, base?.messages?.[k] || '']))
      }
    },
    bump: { activo: false, product_id: '', precio: '', texto: '', boton_si: BOTONES_POR_DEFECTO.extra_si, boton_no: BOTONES_POR_DEFECTO.extra_no }
  };
}

/** Lo que llega del backend, listo para editar. */
function formularioDesde(p, base) {
  const m = p.mensajes || {};
  const b = p.bump || {};
  const seg = m.seguimiento || {};
  const links = linksDe(p);
  return {
    name: p.name || '',
    slug: p.slug || '',
    description: p.description || '',
    resumen: p.resumen || '',
    price: p.price === null || p.price === undefined ? '' : String(p.price),
    currency: p.currency || 'PYG',
    cover_url: p.cover_url || '',
    is_active: p.is_active !== false,
    sort_order: p.sort_order || 0,
    solo_extra: Boolean(p.solo_extra),
    delivery_note: p.delivery_note || '',
    precio_recuperacion: p.precio_recuperacion ?? '',
    preview_urls: Array.isArray(p.preview_urls) ? p.preview_urls : [],
    entregables: links.length ? links.map(l => ({ etiqueta: l.etiqueta || '', url: l.url })) : [{ etiqueta: '', url: '' }],
    mensajes: {
      presentacion: Array.isArray(m.presentacion) && m.presentacion.length ? m.presentacion.slice(0, LIMITES.partes) : [''],
      boton_comprar: m.boton_comprar || BOTONES_POR_DEFECTO.comprar,
      boton_muestras: m.boton_muestras || BOTONES_POR_DEFECTO.muestras,
      muestras_intro: m.muestras_intro || '',
      muestras_cierre: m.muestras_cierre || '',
      pago: m.pago || '',
      // Vacío, el bot manda un mensaje corto de respaldo: se muestra ese mismo, a la vista y editable.
      entrega: m.entrega || ENTREGA_POR_DEFECTO,
      seguimiento: {
        activo: seg.activo !== false,
        // Lo que el producto no tiene propio arranca con los textos base, a la vista y editable.
        textos: Object.fromEntries(CLAVES_SEGUIMIENTO.map(k => [k, seg.textos?.[k] || base?.messages?.[k] || '']))
      }
    },
    bump: {
      activo: Boolean(b.activo),
      product_id: b.product_id ? String(b.product_id) : '',
      precio: b.precio === null || b.precio === undefined ? '' : String(b.precio),
      texto: b.texto || (b.activo ? EXTRA_POR_DEFECTO : ''),
      boton_si: b.boton_si || BOTONES_POR_DEFECTO.extra_si,
      boton_no: b.boton_no || BOTONES_POR_DEFECTO.extra_no
    }
  };
}

/** El formulario como lo espera el backend. */
function paraGuardar(f, { esNuevo }) {
  const cuerpo = {
    name: f.name.trim(),
    description: f.description,
    resumen: f.resumen,
    price: Number(f.price) || 0,
    currency: f.currency,
    cover_url: f.cover_url || null,
    is_active: f.is_active,
    sort_order: Number(f.sort_order) || 0,
    solo_extra: f.solo_extra,
    delivery_note: f.delivery_note,
    precio_recuperacion: f.precio_recuperacion === '' ? null : Number(f.precio_recuperacion),
    preview_urls: f.preview_urls.join('\n'),
    entregables: f.entregables
      .map(e => ({ etiqueta: e.etiqueta.trim(), url: e.url.trim() }))
      .filter(e => e.etiqueta || e.url),
    mensajes: {
      ...f.mensajes,
      presentacion: f.mensajes.presentacion.map(t => t.trim()).filter(Boolean)
    },
    bump: {
      ...f.bump,
      product_id: f.bump.product_id ? Number(f.bump.product_id) : null,
      precio: f.bump.precio === '' ? null : Number(f.bump.precio)
    }
  };
  // El identificador lo arma el servidor a partir del nombre si no se escribió uno.
  if (f.slug.trim() || !esNuevo) cuerpo.slug = f.slug.trim();
  return cuerpo;
}

/** Los mismos chequeos de largo que hace el backend, para avisar antes de mandar. */
function erroresDeLargo(f) {
  const e = [];
  const partes = f.mensajes.presentacion.map(t => t.trim()).filter(Boolean);
  partes.forEach((t, i) => {
    const tope = i === partes.length - 1 ? LIMITES.conBotones : LIMITES.texto;
    if (t.length > tope) e.push(`El mensaje ${i + 1} de la presentación pasa de ${tope} caracteres.`);
  });
  const botones = [
    [f.mensajes.boton_comprar, 'El botón para comprar'],
    [f.mensajes.boton_muestras, 'El botón para ver muestras'],
    [f.bump.boton_si, 'El botón para sumar el extra'],
    [f.bump.boton_no, 'El botón para seguir sin el extra']
  ];
  for (const [t, nombre] of botones) {
    if (String(t || '').trim().length > LIMITES.boton) e.push(`${nombre} pasa de ${LIMITES.boton} caracteres.`);
  }
  if (f.mensajes.muestras_cierre.length > LIMITES.conBotones) e.push(`El texto después de las muestras pasa de ${LIMITES.conBotones} caracteres.`);
  if (f.bump.texto.length > LIMITES.conBotones) e.push(`El mensaje del extra pasa de ${LIMITES.conBotones} caracteres.`);

  const revisar = [
    ...f.mensajes.presentacion.map(t => [t, 'presentacion']),
    [f.mensajes.muestras_intro, 'muestras'], [f.mensajes.muestras_cierre, 'muestras'],
    [f.bump.texto, 'extra'], [f.mensajes.pago, 'pago'], [f.mensajes.entrega, 'entrega'],
    ...CLAVES_SEGUIMIENTO.map(k => [f.mensajes.seguimiento.textos[k], 'seguimiento'])
  ];
  if (revisar.some(([t, paso]) => variablesDesconocidas(t, paso).length)) {
    e.push('Hay un {{dato}} mal escrito en algún mensaje: está marcado en rojo debajo del cuadro.');
  }
  return e;
}

export function ProductoEditorPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const esNuevo = !id;

  const desde = params.get('desde');           // duplicar
  const comoExtra = params.get('extra') === '1'; // crear un producto extra
  const para = params.get('para');             // volver a este producto al guardar
  const extraNuevo = params.get('extraNuevo'); // recién creado: dejarlo elegido

  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState('');
  const [productos, setProductos] = useState([]);
  const [base, setBase] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [subiendo, setSubiendo] = useState('');
  const [activo, setActivo] = useState('producto');
  const [nivel, setNivel] = useState(1);
  const [claveSeguimiento, setClaveSeguimiento] = useState('nivel_1_mirando');
  const [pagoConExtra, setPagoConExtra] = useState(true);
  const [masOpciones, setMasOpciones] = useState(false);
  const portadaRef = useRef(null);
  const muestraRef = useRef(null);

  // ── Carga ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const [lista, textosBase, revision] = await Promise.all([
          productsService.list(token, { todos: true }),
          recoveryMessagesService.obtener(token).catch(() => null),
          ordersService.revisionConfig(token).catch(() => null)
        ]);
        if (!vivo) return;
        setProductos(lista.products || []);
        setBase(textosBase);
        setCuenta(revision?.datos_pago || null);

        let f;
        if (id) {
          const { product } = await productsService.obtener(token, id);
          f = formularioDesde(product, textosBase);
        } else if (desde) {
          const { product } = await productsService.obtener(token, desde);
          f = { ...formularioDesde(product, textosBase), name: `${product.name} (copia)`, slug: '' };
        } else {
          f = formularioNuevo(textosBase);
          if (comoExtra) f.solo_extra = true;
        }

        const inicial = JSON.stringify(f);
        // Recién creado desde "Crear producto extra": queda elegido, pero sin
        // guardar, para que se vea el cambio antes de confirmarlo.
        if (id && extraNuevo) {
          f = {
            ...f,
            bump: { ...f.bump, activo: true, product_id: String(extraNuevo), texto: f.bump.texto || EXTRA_POR_DEFECTO }
          };
          setActivo('extra');
        }
        if (!vivo) return;
        setForm(f);
        setOriginal(desde || comoExtra ? '' : inicial);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [token, id, desde, comoExtra, extraNuevo]);

  const sucio = form !== null && JSON.stringify(form) !== original;

  // El menú de arriba también pregunta antes de salir con cambios.
  useEffect(() => {
    marcarCambiosSinGuardar(sucio);
    return () => marcarCambiosSinGuardar(false);
  }, [sucio]);

  // Cerrar la pestaña o recargar con cambios sin guardar pide confirmación.
  useEffect(() => {
    if (!sucio) return undefined;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sucio]);

  // El paso que se está viendo, para marcarlo en el índice.
  useEffect(() => {
    if (!form) return undefined;
    const secciones = PASOS.map(p => document.getElementById(`paso-${p.id}`)).filter(Boolean);
    if (!secciones.length || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver((entradas) => {
      const visibles = entradas.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visibles[0]) setActivo(visibles[0].target.id.replace('paso-', ''));
    }, { rootMargin: '-80px 0px -55% 0px' });
    secciones.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [form === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cambios ────────────────────────────────────────────────────────────
  const campo = useCallback((k, v) => { setGuardadoOk(false); setForm(f => ({ ...f, [k]: v })); }, []);
  const mensaje = useCallback((k, v) => { setGuardadoOk(false); setForm(f => ({ ...f, mensajes: { ...f.mensajes, [k]: v } })); }, []);
  const extra = useCallback((k, v) => { setGuardadoOk(false); setForm(f => ({ ...f, bump: { ...f.bump, [k]: v } })); }, []);
  const parte = (i, v) => {
    const presentacion = [...form.mensajes.presentacion];
    presentacion[i] = v;
    mensaje('presentacion', presentacion);
  };
  const textoSeguimiento = (k, v) => mensaje('seguimiento', {
    ...form.mensajes.seguimiento,
    textos: { ...form.mensajes.seguimiento.textos, [k]: v }
  });
  const link = (i, k, v) => campo('entregables', form.entregables.map((e, j) => (j === i ? { ...e, [k]: v } : e)));

  const subir = async (e, destino) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La imagen supera los 5 MB. Usá una más liviana.'); return; }
    setSubiendo(destino);
    setError(null);
    try {
      const { url } = await productsService.subirImagen(token, file);
      if (destino === 'portada') campo('cover_url', url);
      else campo('preview_urls', [...form.preview_urls, url].slice(0, LIMITES.muestras));
    } catch (err) {
      setError('No se pudo subir la imagen: ' + err.message);
    } finally {
      setSubiendo('');
    }
  };

  const irA = (paso) => {
    setActivo(paso);
    document.getElementById(`paso-${paso}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const salir = (destino = '/productos') => {
    if (!puedeSalir()) return;
    navigate(destino);
  };

  // ── Guardar ────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form) return;
    const largos = erroresDeLargo(form);
    if (largos.length) { setError(largos.join(' ')); return; }
    if (!form.name.trim()) { setError('Poné un nombre.'); irA('producto'); return; }

    setGuardando(true);
    setError(null);
    try {
      const cuerpo = paraGuardar(form, { esNuevo });
      const guardado = esNuevo
        ? await productsService.create(token, cuerpo)
        : await productsService.update(token, id, cuerpo);

      if (esNuevo) {
        setOriginal(JSON.stringify(form));
        // Si se creó como extra de otro producto, se vuelve a ese con el extra elegido.
        navigate(para ? `/productos/${para}?extraNuevo=${guardado.id}` : `/productos/${guardado.id}`, { replace: true });
        return;
      }
      const f = formularioDesde(guardado, base);
      setForm(f);
      setOriginal(JSON.stringify(f));
      setGuardadoOk(true);
      // Guardado el extra recién creado, la dirección ya no tiene que volver a elegirlo.
      if (extraNuevo) navigate(`/productos/${id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Derivados ──────────────────────────────────────────────────────────
  const otros = useMemo(
    () => productos.filter(p => String(p.id) !== String(id || '')),
    [productos, id]
  );
  const productoExtra = form ? otros.find(p => String(p.id) === String(form.bump.product_id)) : null;

  const revision = useMemo(() => {
    if (!form) return { listo: false, faltan: [], avisos: [] };
    return revisarProducto({ ...form, price: Number(form.price) }, productos);
  }, [form, productos]);

  if (cargando || !form) {
    return (
      <main className="pe">
        <div className="pe-cargando">{error ? error : 'Cargando producto…'}</div>
        {error && <button type="button" className="pe-btn" onClick={() => navigate('/productos')}>Volver a productos</button>}
      </main>
    );
  }

  const moneda = form.currency;
  const precio = Number(form.price) || 0;
  const precioTexto = formatearPrecio(precio, moneda);
  const vars = {
    saludo: 'Buen día', nombre: 'María', producto: form.name || 'Tu producto',
    precio: precioTexto, precio_lista: precioTexto, precio_texto: precioTexto
  };
  const m = form.mensajes;
  const soloExtra = form.solo_extra;
  const hayMuestras = form.preview_urls.length > 0;
  const botonComprar = m.boton_comprar || BOTONES_POR_DEFECTO.comprar;
  const botonMuestras = m.boton_muestras || BOTONES_POR_DEFECTO.muestras;

  const extraPrecio = Number(form.bump.precio) || 0;
  const extraActivo = form.bump.activo && !soloExtra;
  const conExtra = extraActivo && pagoConExtra && productoExtra && extraPrecio > 0;
  const total = precio + (conExtra ? extraPrecio : 0);
  const varsExtra = {
    ...vars,
    extra: productoExtra?.name || 'el producto extra',
    precio_extra: formatearPrecio(extraPrecio, moneda),
    total_con_extra: formatearPrecio(precio + extraPrecio, moneda),
    total_sin_extra: formatearPrecio(precio, moneda)
  };
  const varsPago = {
    ...vars,
    datos_cuenta: bloqueCuenta(cuenta),
    total: formatearPrecio(total, moneda),
    detalle: conExtra
      ? `\n(${form.name || 'Producto'} ${formatearPrecio(precio, moneda)} + ${productoExtra.name} ${formatearPrecio(extraPrecio, moneda)})`
      : ''
  };
  const linksPropios = form.entregables.filter(e => e.url.trim());
  const varsEntrega = {
    ...vars,
    links: bloqueLinks(linksPropios.length ? linksPropios : [{ etiqueta: '', url: '(link de entrega)' }], conExtra ? [productoExtra] : [])
  };

  const escalones = base?.escalones?.length ? base.escalones : MINUTOS_POR_DEFECTO;
  const silencio = base?.silencio || { desde: 21, hasta: 8 };
  const venceHoras = base?.vence_horas || 72;
  const tieneDescuento = Number(form.precio_recuperacion) > 0 && Number(form.precio_recuperacion) < precio;
  const nivelActual = NIVELES.find(n => n.nivel === nivel) || NIVELES[0];
  const claveVista = nivelActual.claves.some(c => c.clave === claveSeguimiento) ? claveSeguimiento : nivelActual.claves[0].clave;
  const descuentoVista = NIVELES.flatMap(n => n.claves).find(c => c.clave === claveVista)?.descuento;
  const varsSeguimiento = {
    nombre: 'María',
    producto: form.name || 'Tu producto',
    precio: descuentoVista && tieneDescuento ? formatearPrecio(form.precio_recuperacion, moneda) : precioTexto,
    vence: 'el jueves 2 a las 18:00',
    moneda
  };

  const estadoPaso = (paso) => {
    if (soloExtra && NO_APLICAN_A_EXTRA.includes(paso)) return 'no-aplica';
    if (revision.faltan.some(f => f.paso === paso)) return 'falta';
    if (paso === 'extra' && !form.bump.activo) return 'apagado';
    if (paso === 'seguimiento' && !m.seguimiento.activo) return 'apagado';
    return 'ok';
  };

  const noAplica = (paso) => soloExtra && NO_APLICAN_A_EXTRA.includes(paso);

  return (
    <main className="pe">
      {/* ── Encabezado ───────────────────────────────────────────────── */}
      <header className="pe-top">
        <button type="button" className="pe-volver" onClick={() => salir()}>← Productos</button>
        <div className="pe-top__titulo">
          <h1>{form.name.trim() || (esNuevo ? 'Nuevo producto' : 'Producto sin nombre')}</h1>
          <p>
            {esNuevo ? 'Todavía no está guardado.' : (form.is_active ? 'Activo' : 'Inactivo: el bot no lo ofrece.')}
            {soloExtra ? ' Solo se vende como extra de otro producto.' : ''}
          </p>
        </div>
        <span className={`pe-chip ${revision.listo ? 'pe-chip--ok' : 'pe-chip--falta'}`}>
          {revision.listo ? 'Listo para vender' : `Falta${revision.faltan.length > 1 ? 'n' : ''} ${revision.faltan.length}`}
        </span>
      </header>

      {error && (
        <div className="pe-alerta" role="alert">
          <strong>No se guardó.</strong> {error}
        </div>
      )}

      <div className="pe-cuerpo">
        {/* ── Índice ─────────────────────────────────────────────────── */}
        <nav className="pe-indice" aria-label="Pasos de la venta">
          <p className="pe-indice__titulo">Pasos de la venta</p>
          <ol>
            {PASOS.map((p, i) => {
              const estado = estadoPaso(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`pe-indice__item ${activo === p.id ? 'is-activo' : ''} is-${estado}`}
                    onClick={() => irA(p.id)}
                  >
                    <span className="pe-indice__num">{estado === 'ok' ? '✓' : i + 1}</span>
                    <span className="pe-indice__texto">
                      <span>{p.titulo}</span>
                      <small>
                        {estado === 'falta' ? revision.faltan.find(f => f.paso === p.id)?.texto
                          : estado === 'apagado' ? 'Apagado'
                          : estado === 'no-aplica' ? 'No aplica'
                          : p.bajada}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {revision.avisos.length > 0 && (
            <ul className="pe-indice__avisos">
              {revision.avisos.map((a, i) => <li key={i}>{a.texto}</li>)}
            </ul>
          )}
        </nav>

        <div className="pe-secciones">
          {/* ── 1. Producto ──────────────────────────────────────────── */}
          <section id="paso-producto" className="pe-sec">
            <header className="pe-sec__cabeza">
              <span className="pe-sec__num">1</span>
              <div>
                <h2>Producto</h2>
                <p>Cómo se llama, cuánto cuesta y con qué imagen se presenta.</p>
              </div>
            </header>
            <div className="pe-sec__grid">
              <div className="pe-campos">
                <div className="pe-campo">
                  <label htmlFor="p-nombre" className="pe-etiqueta">Nombre</label>
                  <input id="p-nombre" className="pe-input" value={form.name}
                    onChange={(e) => campo('name', e.target.value)}
                    placeholder="Como lo va a ver el cliente" />
                </div>

                <div className="pe-fila">
                  <div className="pe-campo">
                    <label htmlFor="p-precio" className="pe-etiqueta">Precio</label>
                    <input id="p-precio" type="number" min="0" inputMode="numeric" className="pe-input pe-num"
                      value={form.price} onChange={(e) => campo('price', e.target.value)} placeholder="19000" />
                  </div>
                  <div className="pe-campo pe-campo--angosto">
                    <label htmlFor="p-moneda" className="pe-etiqueta">Moneda</label>
                    <select id="p-moneda" className="pe-input" value={form.currency} onChange={(e) => campo('currency', e.target.value)}>
                      <option value="PYG">PYG</option>
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                      <option value="BRL">BRL</option>
                    </select>
                  </div>
                </div>

                <div className="pe-campo">
                  <span className="pe-etiqueta">Portada</span>
                  <div className="pe-imagen">
                    {form.cover_url
                      ? <img src={form.cover_url} alt="Portada" className="pe-imagen__mini" />
                      : <div className="pe-imagen__mini pe-imagen__mini--vacia" aria-hidden="true" />}
                    <div className="pe-imagen__acciones">
                      <input ref={portadaRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => subir(e, 'portada')} />
                      <button type="button" className="pe-btn" disabled={subiendo === 'portada'} onClick={() => portadaRef.current?.click()}>
                        {subiendo === 'portada' ? 'Subiendo…' : (form.cover_url ? 'Cambiar imagen' : 'Elegir imagen')}
                      </button>
                      {form.cover_url && <button type="button" className="pe-btn pe-btn--quitar" onClick={() => campo('cover_url', '')}>Quitar</button>}
                    </div>
                  </div>
                  <p className="pe-ayuda">JPG, PNG o WebP de hasta 5 MB. Sale antes del primer mensaje de la presentación.</p>
                </div>

                <div className="pe-campo">
                  <label htmlFor="p-desc" className="pe-etiqueta">Descripción para la IA</label>
                  <textarea id="p-desc" rows={3} className="pe-input pe-textarea" value={form.description}
                    onChange={(e) => campo('description', e.target.value)}
                    placeholder="Qué es, para quién es, qué trae, en qué formato llega." />
                  <p className="pe-ayuda">No se le manda al cliente tal cual: la usa la IA para contestar las preguntas que no están en los mensajes.</p>
                </div>

                <label className="pe-check">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => campo('is_active', e.target.checked)} />
                  <span><strong>Activo.</strong> Apagado, el bot no lo ofrece ni lo cobra.</span>
                </label>

                <button type="button" className="pe-desplegar" aria-expanded={masOpciones} onClick={() => setMasOpciones(v => !v)}>
                  {masOpciones ? '▾' : '▸'} Más opciones
                </button>
                {masOpciones && (
                  <div className="pe-mas">
                    <label className="pe-check">
                      <input type="checkbox" checked={form.solo_extra} onChange={(e) => campo('solo_extra', e.target.checked)} />
                      <span><strong>Solo se vende como extra</strong> de otro producto. El bot no lo ofrece suelto ni lo muestra en la lista.</span>
                    </label>
                    <div className="pe-fila">
                      <div className="pe-campo">
                        <label htmlFor="p-slug" className="pe-etiqueta">Identificador interno</label>
                        <input id="p-slug" className="pe-input" value={form.slug}
                          onChange={(e) => campo('slug', e.target.value)} placeholder="Se arma solo con el nombre" />
                      </div>
                      <div className="pe-campo pe-campo--angosto">
                        <label htmlFor="p-orden" className="pe-etiqueta">Orden en la lista</label>
                        <input id="p-orden" type="number" className="pe-input pe-num" value={form.sort_order}
                          onChange={(e) => campo('sort_order', e.target.value)} />
                      </div>
                    </div>
                    <p className="pe-ayuda">El número más bajo aparece primero cuando el bot pregunta cuál de los productos quiere.</p>
                  </div>
                )}
              </div>
              <VistaWhatsApp
                titulo="En la lista de productos"
                burbujas={soloExtra
                  ? [{ de: 'nota', texto: 'Este producto no aparece en la lista: solo se ofrece como extra de otro.' }]
                  : [{ texto: `¿Cuál de estos materiales te interesa?\n\n• *${form.name || 'Tu producto'}* — ${precioTexto}` }]}
              />
            </div>
          </section>

          {/* ── 2. Presentación ──────────────────────────────────────── */}
          <section id="paso-presentacion" className={`pe-sec ${noAplica('presentacion') ? 'is-no-aplica' : ''}`}>
            <header className="pe-sec__cabeza">
              <span className="pe-sec__num">2</span>
              <div>
                <h2>Presentación</h2>
                <p>Lo primero que recibe quien pregunta por este producto: la portada y hasta tres mensajes, con unos segundos entre uno y otro. El último lleva los botones.</p>
              </div>
            </header>
            {noAplica('presentacion') ? <p className="pe-no-aplica">No se usa: este producto solo se vende como extra.</p> : (
              <div className="pe-sec__grid">
                <div className="pe-campos">
                  {m.presentacion.map((t, i, lista) => {
                    const ultimo = i === lista.length - 1;
                    return (
                      <CampoMensaje
                        key={i}
                        id={`p-msg-${i}`}
                        etiqueta={`Mensaje ${i + 1}${ultimo ? ' · con los botones' : ''}`}
                        valor={t}
                        onChange={(v) => parte(i, v)}
                        tope={ultimo ? LIMITES.conBotones : LIMITES.texto}
                        paso="presentacion"
                        filas={ultimo ? 4 : 5}
                        placeholder={i === 0 ? '¡{{saludo}}, {{nombre}}! …' : '💰 Precio: {{precio_texto}}'}
                        accion={lista.length > 1 ? (
                          <button type="button" className="pe-link pe-link--quitar"
                            onClick={() => mensaje('presentacion', lista.filter((_, j) => j !== i))}>Quitar</button>
                        ) : null}
                      />
                    );
                  })}
                  {m.presentacion.length < LIMITES.partes && (
                    <button type="button" className="pe-btn" onClick={() => mensaje('presentacion', [...m.presentacion, ''])}>+ Agregar mensaje</button>
                  )}
                  <div className="pe-fila">
                    <CampoBoton id="p-btn-comprar" etiqueta="Botón para comprar" valor={m.boton_comprar} onChange={(v) => mensaje('boton_comprar', v)} />
                    <CampoBoton id="p-btn-muestras" etiqueta="Botón para ver muestras" valor={m.boton_muestras} onChange={(v) => mensaje('boton_muestras', v)}
                      ayuda={hayMuestras ? null : 'Aparece cuando cargues páginas de muestra.'} />
                  </div>
                </div>
                <VistaWhatsApp
                  vacio="Escribí el primer mensaje para verlo acá."
                  burbujas={[
                    ...(form.cover_url ? [{ imagen: form.cover_url }] : []),
                    ...m.presentacion.map(t => t.trim()).filter(Boolean).map((t, i, lista) => ({
                      texto: renderizar(t, vars),
                      botones: i === lista.length - 1 ? [...(hayMuestras ? [botonMuestras] : []), botonComprar] : []
                    }))
                  ]}
                />
              </div>
            )}
          </section>

          {/* ── 3. Muestras ──────────────────────────────────────────── */}
          <section id="paso-muestras" className={`pe-sec ${noAplica('muestras') ? 'is-no-aplica' : ''}`}>
            <header className="pe-sec__cabeza">
              <span className="pe-sec__num">3</span>
              <div>
                <h2>Muestras</h2>
                <p>Si toca "{botonMuestras}", recibe estas imágenes y un mensaje con el botón para comprar. Dos o tres alcanzan: quien ya vio todo no tiene nada que comprar.</p>
              </div>
            </header>
            {noAplica('muestras') ? <p className="pe-no-aplica">No se usa: este producto solo se vende como extra.</p> : (
              <div className="pe-sec__grid">
                <div className="pe-campos">
                  <div className="pe-campo">
                    <span className="pe-etiqueta">Imágenes ({form.preview_urls.length} de {LIMITES.muestras})</span>
                    <div className="pe-muestras">
                      {form.preview_urls.map(url => (
                        <div key={url} className="pe-muestra">
                          <img src={url} alt="Página de muestra" />
                          <button type="button" aria-label="Quitar esta muestra" onClick={() => campo('preview_urls', form.preview_urls.filter(u => u !== url))}>×</button>
                        </div>
                      ))}
                      {form.preview_urls.length < LIMITES.muestras && (
                        <button type="button" className="pe-muestra pe-muestra--agregar" disabled={subiendo === 'muestra'} onClick={() => muestraRef.current?.click()}>
                          {subiendo === 'muestra' ? 'Subiendo…' : '+ Agregar'}
                        </button>
                      )}
                    </div>
                    <input ref={muestraRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => subir(e, 'muestra')} />
                    {!hayMuestras && <p className="pe-ayuda">Sin imágenes, el botón "{botonMuestras}" no aparece.</p>}
                  </div>
                  <CampoMensaje id="p-muestras-intro" etiqueta="Antes de las imágenes (opcional)" valor={m.muestras_intro}
                    onChange={(v) => mensaje('muestras_intro', v)} tope={LIMITES.texto} paso="muestras" filas={2} />
                  <CampoMensaje id="p-muestras-cierre" etiqueta="Después de las imágenes · con el botón de comprar" valor={m.muestras_cierre}
                    onChange={(v) => mensaje('muestras_cierre', v)} tope={LIMITES.conBotones} paso="muestras" filas={3}
                    ayuda="Vacío, sale el nombre del producto con el precio." />
                </div>
                <VistaWhatsApp
                  burbujas={[
                    { de: 'cliente', texto: botonMuestras },
                    ...(m.muestras_intro.trim() ? [{ texto: renderizar(m.muestras_intro, vars) }] : []),
                    ...form.preview_urls.map(u => ({ imagen: u })),
                    { texto: renderizar(m.muestras_cierre || '*{{producto}}* — {{precio_texto}}', vars), botones: [botonComprar] }
                  ]}
                />
              </div>
            )}
          </section>

          {/* ── 4. Extra ─────────────────────────────────────────────── */}
          <section id="paso-extra" className={`pe-sec ${noAplica('extra') ? 'is-no-aplica' : ''}`}>
            <header className="pe-sec__cabeza">
              <span className="pe-sec__num">4</span>
              <div>
                <h2>Extra al comprar <span className="pe-sec__marca">order bump</span></h2>
                <p>Cuando toca "{botonComprar}", antes de pasarle los datos se le ofrece sumar otro producto a un precio especial, con dos botones. Se ofrece una sola vez. Si lo suma, paga el total y recibe los links de los dos.</p>
              </div>
            </header>
            {noAplica('extra') ? <p className="pe-no-aplica">No se usa: este producto ya es un extra.</p> : (
              <div className="pe-sec__grid">
                <div className="pe-campos">
                  <label className="pe-interruptor">
                    <input type="checkbox" checked={form.bump.activo}
                      onChange={(e) => setForm(f => ({
                        ...f,
                        bump: { ...f.bump, activo: e.target.checked, texto: f.bump.texto || (e.target.checked ? EXTRA_POR_DEFECTO : '') }
                      }))} />
                    <span className="pe-interruptor__pista" aria-hidden="true" />
                    <span>{form.bump.activo ? 'Se ofrece un extra' : 'Sin extra: va directo a los datos de pago'}</span>
                  </label>

                  {form.bump.activo && (
                    <>
                      <div className="pe-campo">
                        <label htmlFor="p-extra" className="pe-etiqueta">Qué se ofrece</label>
                        <select id="p-extra" className="pe-input" value={form.bump.product_id} onChange={(e) => extra('product_id', e.target.value)}>
                          <option value="">Elegí un producto…</option>
                          {otros.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {formatearPrecio(p.price, p.currency)}{p.solo_extra ? ' · solo extra' : ''}{linksDe(p).length ? '' : ' · sin link'}
                            </option>
                          ))}
                        </select>
                        <p className="pe-ayuda">
                          ¿No está en la lista?{' '}
                          <button type="button" className="pe-link" onClick={() => salir(`/productos/nuevo?extra=1${id ? `&para=${id}` : ''}`)}>
                            Crear un producto extra
                          </button>{' '}
                          {id ? 'y volver acá con él elegido.' : '(guardá este primero para volver con él elegido).'}
                        </p>
                      </div>

                      <div className="pe-campo">
                        <label htmlFor="p-extra-precio" className="pe-etiqueta">Precio del extra</label>
                        <input id="p-extra-precio" type="number" min="0" inputMode="numeric" className="pe-input pe-num"
                          value={form.bump.precio} onChange={(e) => extra('precio', e.target.value)} placeholder="10000" />
                        <p className="pe-ayuda">
                          {productoExtra
                            ? `Suelto cuesta ${formatearPrecio(productoExtra.price, productoExtra.currency)}. Con el extra paga ${formatearPrecio(precio + extraPrecio, moneda)} en total.`
                            : 'Lo que se suma al total si dice que sí.'}
                        </p>
                      </div>

                      <CampoMensaje id="p-extra-texto" etiqueta="Mensaje de la oferta · con los dos botones" valor={form.bump.texto}
                        onChange={(v) => extra('texto', v)} tope={LIMITES.conBotones} paso="extra" filas={5} />
                      <div className="pe-fila">
                        <CampoBoton id="p-extra-si" etiqueta="Botón para sumarlo" valor={form.bump.boton_si} onChange={(v) => extra('boton_si', v)} />
                        <CampoBoton id="p-extra-no" etiqueta="Botón para seguir sin él" valor={form.bump.boton_no} onChange={(v) => extra('boton_no', v)} />
                      </div>
                    </>
                  )}
                </div>
                <VistaWhatsApp
                  burbujas={form.bump.activo ? [
                    { de: 'cliente', texto: botonComprar },
                    ...(productoExtra?.cover_url ? [{ imagen: productoExtra.cover_url }] : []),
                    { texto: renderizar(form.bump.texto || EXTRA_POR_DEFECTO, varsExtra), botones: [form.bump.boton_si || BOTONES_POR_DEFECTO.extra_si, form.bump.boton_no || BOTONES_POR_DEFECTO.extra_no] },
                    { de: 'nota', texto: 'Toque lo que toque, después le llegan los datos de pago con el total que corresponde (paso 5).' }
                  ] : [
                    { de: 'cliente', texto: botonComprar },
                    { de: 'nota', texto: 'Sin extra: le llegan los datos de pago enseguida (paso 5).' }
                  ]}
                />
              </div>
            )}
          </section>

          {/* ── 5. Datos de pago ─────────────────────────────────────── */}
          <section id="paso-pago" className={`pe-sec ${noAplica('pago') ? 'is-no-aplica' : ''}`}>
            <header className="pe-sec__cabeza">
              <span className="pe-sec__num">5</span>
              <div>
                <h2>Datos de pago</h2>
                <p>El mensaje con la cuenta para transferir y el total exacto. La cuenta es la misma para todos los productos y se carga en Pedidos → Revisión automática.</p>
              </div>
            </header>
            {noAplica('pago') ? <p className="pe-no-aplica">Se cobra junto con el producto principal.</p> : (
              <div className="pe-sec__grid">
                <div className="pe-campos">
                  {cuenta && !cuenta.configurado && (
                    <p className="pe-aviso">
                      Todavía no hay una cuenta cargada. Mientras tanto el bot usa el mensaje de pago que tiene n8n, sin el extra.
                      Cargala en Pedidos → Revisión automática → Datos de pago.
                    </p>
                  )}
                  <label className="pe-check">
                    <input type="checkbox" checked={!m.pago}
                      onChange={(e) => mensaje('pago', e.target.checked ? '' : PAGO_POR_DEFECTO)} />
                    <span><strong>Usar el texto estándar.</strong> Destildalo para escribir uno propio para este producto.</span>
                  </label>
                  {m.pago ? (
                    <CampoMensaje id="p-pago" etiqueta="Mensaje con los datos" valor={m.pago} onChange={(v) => mensaje('pago', v)}
                      tope={LIMITES.texto} paso="pago" filas={8}
                      ayuda="Dejá {{datos_cuenta}} y {{total}}: son la cuenta y el monto de esa persona. {{detalle}} muestra el desglose solo si sumó el extra." />
                  ) : null}
                  {extraActivo && (
                    <div className="pe-segmento" role="group" aria-label="Ver el mensaje">
                      <button type="button" className={pagoConExtra ? 'is-activo' : ''} onClick={() => setPagoConExtra(true)}>Si suma el extra</button>
                      <button type="button" className={!pagoConExtra ? 'is-activo' : ''} onClick={() => setPagoConExtra(false)}>Si no lo suma</button>
                    </div>
                  )}
                </div>
                <VistaWhatsApp
                  burbujas={[
                    { de: 'cliente', texto: extraActivo ? (pagoConExtra ? form.bump.boton_si : form.bump.boton_no) : botonComprar },
                    { texto: renderizar(m.pago || PAGO_POR_DEFECTO, varsPago) }
                  ]}
                />
              </div>
            )}
          </section>

          {/* ── 6. Entrega ───────────────────────────────────────────── */}
          <section id="paso-entrega" className="pe-sec">
            <header className="pe-sec__cabeza">
              <span className="pe-sec__num">6</span>
              <div>
                <h2>Entrega</h2>
                <p>
                  Cuando se confirma el pago, a mano o automático, le llega este mensaje con los links.
                  {soloExtra ? ' Como es un extra, sus links se agregan al mensaje de entrega del producto principal.' : ' Si sumó el extra, abajo van también los links del extra.'}
                </p>
              </div>
            </header>
            <div className="pe-sec__grid">
              <div className="pe-campos">
                <div className="pe-campo">
                  <span className="pe-etiqueta">Links de entrega</span>
                  <div className="pe-links">
                    {form.entregables.map((e, i) => (
                      <div key={i} className="pe-link-fila">
                        <input className="pe-input pe-link-fila__etiqueta" aria-label={`Nombre del archivo ${i + 1}`}
                          value={e.etiqueta} onChange={(ev) => link(i, 'etiqueta', ev.target.value)}
                          placeholder={form.entregables.length > 1 ? 'Qué es (ej. Libro)' : 'Nombre (opcional)'} />
                        <input className={`pe-input pe-link-fila__url ${e.url && !linkValido(e.url) ? 'is-error' : ''}`} aria-label={`Link ${i + 1}`}
                          value={e.url} onChange={(ev) => link(i, 'url', ev.target.value)} placeholder="https://drive.google.com/…" />
                        {form.entregables.length > 1 && (
                          <button type="button" className="pe-link pe-link--quitar" aria-label={`Quitar el link ${i + 1}`}
                            onClick={() => campo('entregables', form.entregables.filter((_, j) => j !== i))}>Quitar</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {form.entregables.length < LIMITES.links && (
                    <button type="button" className="pe-btn" onClick={() => campo('entregables', [...form.entregables, { etiqueta: '', url: '' }])}>+ Agregar otro link</button>
                  )}
                  <p className="pe-ayuda">Uno por archivo. Con varios, poné qué es cada uno: así sale en el mensaje. Los links nunca viajan antes de que el pago esté confirmado.</p>
                </div>
                {!soloExtra && (
                  <CampoMensaje id="p-entrega" etiqueta="Mensaje de entrega" valor={m.entrega} onChange={(v) => mensaje('entrega', v)}
                    tope={LIMITES.texto} paso="entrega" filas={6}
                    ayuda="{{links}} es donde van los links. Si no lo ponés, se agregan al final. Vacío, sale un mensaje corto con el nombre y los links." />
                )}
              </div>
              <VistaWhatsApp
                burbujas={soloExtra ? [
                  { de: 'nota', texto: 'En el mensaje de entrega del producto principal se agrega:' },
                  { texto: bloqueLinks([], [{ name: form.name || 'Este extra', entregables: linksPropios }]) || '(sin links todavía)' }
                ] : [
                  { de: 'nota', texto: 'Pago confirmado' },
                  { texto: renderizar(m.entrega || ENTREGA_POR_DEFECTO, varsEntrega) + (/\{\{\s*links\s*\}\}/.test(m.entrega || ENTREGA_POR_DEFECTO) ? '' : `\n\n${varsEntrega.links}`) }
                ]}
              />
            </div>
          </section>

          {/* ── 7. Seguimiento ───────────────────────────────────────── */}
          <section id="paso-seguimiento" className={`pe-sec ${noAplica('seguimiento') ? 'is-no-aplica' : ''}`}>
            <header className="pe-sec__cabeza">
              <span className="pe-sec__num">7</span>
              <div>
                <h2>Seguimiento <span className="pe-sec__marca">remarketing</span></h2>
                <p>
                  Si alguien se queda a mitad de camino, el bot le escribe hasta tres veces: a las {escalones.map(horas).join(', ').replace(/, ([^,]*)$/, ' y $1')} de su último mensaje.
                  Nunca entre las {silencio.desde}:00 y las {silencio.hasta}:00, y nunca después de 24 h (WhatsApp lo cobra). Estos textos son solo de este producto.
                </p>
              </div>
            </header>
            {noAplica('seguimiento') ? <p className="pe-no-aplica">No se usa: el seguimiento es del producto principal.</p> : (
              <div className="pe-sec__grid">
                <div className="pe-campos">
                  <label className="pe-interruptor">
                    <input type="checkbox" checked={m.seguimiento.activo}
                      onChange={(e) => mensaje('seguimiento', { ...m.seguimiento, activo: e.target.checked })} />
                    <span className="pe-interruptor__pista" aria-hidden="true" />
                    <span>{m.seguimiento.activo ? 'Seguimiento encendido' : 'Seguimiento apagado: no se le escribe a nadie por este producto'}</span>
                  </label>

                  {m.seguimiento.activo && (
                    <>
                      <div className="pe-campo">
                        <label htmlFor="p-recuperacion" className="pe-etiqueta">Precio de recuperación (opcional)</label>
                        <input id="p-recuperacion" type="number" min="0" inputMode="numeric" className="pe-input pe-num"
                          value={form.precio_recuperacion} onChange={(e) => campo('precio_recuperacion', e.target.value)} placeholder="15000" />
                        <p className="pe-ayuda">
                          Desde el 2.º mensaje se le ofrece este precio, válido {venceHoras} h. Vacío, no hay descuento y salen las versiones "sin descuento".
                          {form.precio_recuperacion !== '' && !tieneDescuento ? ' Tiene que ser menor que el precio para contar como descuento.' : ''}
                        </p>
                      </div>

                      <div className="pe-pestanas" role="tablist" aria-label="Mensaje">
                        {NIVELES.map((n, i) => (
                          <button key={n.nivel} type="button" role="tab" aria-selected={nivel === n.nivel}
                            className={nivel === n.nivel ? 'is-activo' : ''}
                            onClick={() => { setNivel(n.nivel); setClaveSeguimiento(n.claves[0].clave); }}>
                            {n.nivel}.º · {horas(escalones[i] ?? MINUTOS_POR_DEFECTO[i])}
                          </button>
                        ))}
                      </div>

                      {nivelActual.claves.map(c => (
                        <div key={c.clave} className={c.descuento && !tieneDescuento ? 'pe-atenuado' : ''}>
                          <CampoMensaje
                            id={`p-seg-${c.clave}`}
                            etiqueta={c.titulo}
                            valor={m.seguimiento.textos[c.clave]}
                            onChange={(v) => textoSeguimiento(c.clave, v)}
                            onFocus={() => setClaveSeguimiento(c.clave)}
                            tope={LIMITES.texto}
                            paso="seguimiento"
                            filas={4}
                            ayuda={c.descuento && !tieneDescuento ? 'Sin precio de recuperación esta versión no se manda.' : null}
                          />
                        </div>
                      ))}
                      {base?.messages && (
                        <button type="button" className="pe-link"
                          onClick={() => {
                            if (window.confirm('¿Reemplazar los siete mensajes de este producto por los textos base?')) {
                              mensaje('seguimiento', { ...m.seguimiento, textos: Object.fromEntries(CLAVES_SEGUIMIENTO.map(k => [k, base.messages[k] || ''])) });
                            }
                          }}>
                          Volver a los textos base
                        </button>
                      )}
                    </>
                  )}
                </div>
                <VistaWhatsApp
                  titulo={`Mensaje ${nivel}.º · ${NIVELES.flatMap(n => n.claves).find(c => c.clave === claveVista)?.titulo || ''}`}
                  burbujas={m.seguimiento.activo ? [
                    { de: 'nota', texto: `${horas(escalones[nivel - 1] ?? MINUTOS_POR_DEFECTO[nivel - 1])} sin respuesta` },
                    { texto: renderizar(m.seguimiento.textos[claveVista], varsSeguimiento) }
                  ] : [{ de: 'nota', texto: 'Apagado: nadie recibe seguimiento por este producto.' }]}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Barra para guardar ────────────────────────────────────────── */}
      <div className="pe-barra" role="region" aria-label="Guardar">
        <span className="pe-barra__estado">
          {guardando ? 'Guardando…'
            : sucio ? 'Tenés cambios sin guardar'
            : guardadoOk ? 'Guardado. El próximo cliente ya recibe esta versión.'
            : 'Sin cambios'}
        </span>
        <div className="pe-barra__acciones">
          {!esNuevo && (
            <button type="button" className="pe-btn" onClick={() => salir(`/productos/nuevo?desde=${id}`)}>Duplicar</button>
          )}
          <button type="button" className="pe-btn pe-btn--primario" disabled={guardando || (!sucio && !esNuevo) || Boolean(subiendo)} onClick={guardar}>
            {guardando ? 'Guardando…' : (esNuevo ? 'Crear producto' : 'Guardar cambios')}
          </button>
        </div>
      </div>
    </main>
  );
}

export default ProductoEditorPage;
