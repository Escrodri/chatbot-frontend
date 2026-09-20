import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { productsService } from '../services/products.service';

const VACIO = {
  slug: '', name: '', description: '', price: '', currency: 'PYG',
  delivery_url: '', delivery_note: '', cover_url: '', is_active: true, sort_order: 0
};

/**
 * Catálogo de productos digitales.
 *
 * Lo que se carga acá es exactamente lo que el bot le cotiza al cliente por
 * WhatsApp: mismo nombre, mismo precio, mismo orden. Por eso la pantalla
 * muestra al costado cómo va a verse el mensaje — para que nadie tenga que
 * adivinar qué le está diciendo el bot a la gente.
 */
export function ProductosPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [vistaPrevia, setVistaPrevia] = useState('');
  const [form, setForm] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

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

  const limpiar = () => { setForm(VACIO); setEditandoId(null); };

  const editar = (p) => {
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
      is_active: p.is_active !== false,
      sort_order: p.sort_order || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.slug.trim() || !form.name.trim()) {
      setError('El producto necesita al menos un identificador (slug) y un nombre.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const cuerpo = { ...form, price: Number(form.price) || 0, sort_order: Number(form.sort_order) || 0 };
      if (editandoId) {
        await productsService.update(token, editandoId, cuerpo);
      } else {
        await productsService.create(token, cuerpo);
      }
      limpiar();
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async (p) => {
    if (!window.confirm(`¿Sacar "${p.name}" del catálogo? Deja de ofrecerse, pero las ventas ya hechas se conservan.`)) return;
    try {
      await productsService.desactivar(token, p.id);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const input = {
    width: '100%', padding: '9px 11px', borderRadius: '8px',
    border: '1px solid var(--border-gold, #ddd)', fontSize: '.9rem',
    background: 'var(--bg-card, #fff)', color: 'inherit'
  };
  const label = { display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-soft)' };

  return (
    <div className="admin-page">
      <Navbar currentRoute="productos" onNavigate={(r) => navigate('/' + r)} />

      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '28px 20px 60px' }}>
        <header style={{ marginBottom: '22px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.6rem' }}>Productos</h2>
          <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '.92rem' }}>
            Esto es lo que el bot cotiza por WhatsApp. Cambiás un precio acá y el bot lo usa
            en la próxima conversación, sin tocar nada más.
          </p>
        </header>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,.12)', color: '#b91c1c', marginBottom: '18px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: '22px', alignItems: 'start' }}>
          {/* Formulario */}
          <form
            onSubmit={guardar}
            style={{ border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px', padding: '18px', background: 'var(--bg-card, #fff)' }}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem' }}>
              {editandoId ? 'Editar producto' : 'Nuevo producto'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={label} htmlFor="p-name">Nombre</label>
                <input id="p-name" style={input} value={form.name} onChange={(e) => campo('name', e.target.value)} placeholder="Historias de la Biblia — Tomo I" />
              </div>
              <div>
                <label style={label} htmlFor="p-slug">Identificador (slug)</label>
                <input id="p-slug" style={input} value={form.slug} onChange={(e) => campo('slug', e.target.value)} placeholder="historias-biblia-1" />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={label} htmlFor="p-desc">Descripción corta</label>
              <textarea id="p-desc" rows={2} style={{ ...input, resize: 'vertical' }} value={form.description}
                onChange={(e) => campo('description', e.target.value)}
                placeholder="Una línea. Es la que sale abajo del nombre en el mensaje de WhatsApp." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={label} htmlFor="p-price">Precio</label>
                <input id="p-price" type="number" min="0" style={input} value={form.price} onChange={(e) => campo('price', e.target.value)} placeholder="35000" />
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
              <div>
                <label style={label} htmlFor="p-orden">Orden</label>
                <input id="p-orden" type="number" style={input} value={form.sort_order} onChange={(e) => campo('sort_order', e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={label} htmlFor="p-cover">Imagen de portada (URL)</label>
              <input id="p-cover" style={input} value={form.cover_url} onChange={(e) => campo('cover_url', e.target.value)} placeholder="https://..." />
              <small style={{ color: 'var(--text-soft)', fontSize: '.75rem' }}>
                Es la que el bot manda después de la bienvenida. Tiene que ser pública.
              </small>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={label} htmlFor="p-entrega">Link de entrega (el PDF)</label>
              <input id="p-entrega" style={input} value={form.delivery_url} onChange={(e) => campo('delivery_url', e.target.value)} placeholder="https://..." />
              <small style={{ color: 'var(--text-soft)', fontSize: '.75rem' }}>
                Esto NO viaja en el catálogo: el backend solo lo entrega cuando el pedido está pagado.
              </small>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.88rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => campo('is_active', e.target.checked)} />
                Activo (se ofrece en el catálogo)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-send-message" disabled={guardando}
                style={{ padding: '9px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                {guardando ? 'Guardando…' : (editandoId ? 'Guardar cambios' : 'Crear producto')}
              </button>
              {editandoId && (
                <button type="button" className="btn-card-action" onClick={limpiar} style={{ padding: '9px 16px' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Vista previa del mensaje */}
          <div style={{ border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px', padding: '18px', background: 'var(--bg-card, #fff)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>Así lo ve el cliente</h3>
            <p style={{ margin: '0 0 12px', fontSize: '.8rem', color: 'var(--text-soft)' }}>
              El mensaje exacto que manda el bot cuando alguien pregunta por precios.
            </p>
            <div style={{
              background: '#dcf8c6', color: '#111', borderRadius: '10px', padding: '12px 14px',
              fontSize: '.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5,
              fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '80px'
            }}>
              {vistaPrevia || 'Cargá un producto para ver el mensaje.'}
            </div>
          </div>
        </div>

        {/* Listado */}
        <h3 style={{ margin: '28px 0 12px', fontSize: '1.05rem' }}>
          Catálogo {cargando ? '' : `(${productos.length})`}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {productos.length === 0 && !cargando && (
            <p style={{ color: 'var(--text-soft)' }}>Todavía no hay productos cargados.</p>
          )}

          {productos.map(p => (
            <div key={p.id} style={{
              border: '1px solid var(--border-gold, #e2e2e2)', borderRadius: '10px',
              padding: '14px', background: 'var(--bg-card, #fff)',
              opacity: p.is_active ? 1 : 0.55
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'start' }}>
                <strong style={{ fontSize: '.95rem' }}>{p.name}</strong>
                {!p.is_active && (
                  <span style={{ fontSize: '.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(107,114,128,.16)', color: '#6b7280', fontWeight: 700 }}>
                    Inactivo
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, margin: '6px 0', color: 'var(--wa-teal-dark, #047857)' }}>
                {p.price_formatted || productsService.formatearPrecio(p.price, p.currency)}
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '.82rem', color: 'var(--text-soft)', lineHeight: 1.45 }}>
                {p.description || 'Sin descripción'}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-card-action" style={{ fontSize: '.78rem', padding: '5px 10px' }} onClick={() => editar(p)}>
                  Editar
                </button>
                {p.is_active && (
                  <button type="button" style={{
                    fontSize: '.78rem', padding: '5px 10px', borderRadius: '6px',
                    border: '1px solid #b91c1c33', background: 'transparent', color: '#b91c1c', cursor: 'pointer'
                  }} onClick={() => desactivar(p)}>
                    Sacar del catálogo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default ProductosPage;
