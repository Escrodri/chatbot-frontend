import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { productsService } from '../services/products.service';

const VACIO = {
  slug: '', name: '', description: '', price: '', currency: 'PYG',
  delivery_url: '', delivery_note: '', cover_url: '', is_active: true, sort_order: 0,
  precio_recuperacion: '', preview_urls: ''
};

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

  const abrirNuevo = () => {
    setEditandoId(null);
    // La posición por defecto manda el producto al final de la lista.
    setForm({ ...VACIO, sort_order: productos.length });
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
      precio_recuperacion: p.precio_recuperacion ?? '',
      preview_urls: Array.isArray(p.preview_urls) ? p.preview_urls.join('\n') : (p.preview_urls || ''),
      is_active: p.is_active !== false,
      sort_order: p.sort_order || 0
    });
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

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Poné un nombre.'); return; }
    if (!form.slug.trim()) { setError('Poné un identificador (slug).'); return; }

    setGuardando(true);
    setError(null);
    try {
      const cuerpo = {
        ...form,
        price: Number(form.price) || 0,
        sort_order: Number(form.sort_order) || 0
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
                placeholder="Historias de la Biblia — Tomo I" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label} htmlFor="p-slug">Identificador</label>
              <input id="p-slug" style={input} value={form.slug}
                onChange={(e) => campo('slug', e.target.value)}
                placeholder="historias-biblia-1" />
              <small style={ayuda}>
                Un nombre corto sin espacios, para uso interno. El cliente nunca lo ve.
              </small>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label} htmlFor="p-desc">Descripción</label>
              <textarea id="p-desc" rows={2} style={{ ...input, resize: 'vertical' }} value={form.description}
                onChange={(e) => campo('description', e.target.value)}
                placeholder="10 relatos para leer en voz alta, en PDF." />
              <small style={ayuda}>Una línea. Sale abajo del nombre en el mensaje de WhatsApp.</small>
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
              <label style={label} htmlFor="p-previews">Páginas de muestra</label>
              <textarea id="p-previews" rows={3} style={{ ...input, resize: 'vertical', fontSize: '.82rem' }}
                value={form.preview_urls}
                onChange={(e) => campo('preview_urls', e.target.value)}
                placeholder={'https://.../pagina-1.jpg\nhttps://.../pagina-2.jpg'} />
              <small style={ayuda}>
                Una URL por línea. Son las que manda el bot cuando tocan "VER PÁGINAS".
                Poné dos o tres, no más: quien ya vio todo el material no tiene nada que comprar.
              </small>
            </div>

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
