import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productsService } from '../services/products.service';
import { formatearPrecio, revisarProducto } from '../lib/productoTextos';
import { formatoWhatsApp } from '../components/productos/VistaWhatsApp';
import '../productos.css';

/**
 * Lista de productos.
 *
 * Se ve de un vistazo qué se puede vender y qué no, con lo que le falta a
 * cada uno. Agregar y editar abren la pantalla del producto, no un modal:
 * ahí están los siete pasos de la venta, cada uno con su vista previa.
 */

const FILTROS = [
  { id: 'todos', titulo: 'Todos' },
  { id: 'faltan', titulo: 'Con cosas por completar' },
  { id: 'listos', titulo: 'Listos' },
  { id: 'inactivos', titulo: 'Inactivos' }
];

export function ProductosPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [catalogo, setCatalogo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await productsService.list(token, { todos: true });
      setProductos(data.products || []);
      setCatalogo(data.catalog_text || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const filas = useMemo(() => productos.map(p => ({ p, r: revisarProducto(p, productos) })), [productos]);

  const cuenta = {
    todos: filas.length,
    faltan: filas.filter(f => f.p.is_active && !f.r.listo).length,
    listos: filas.filter(f => f.p.is_active && f.r.listo).length,
    inactivos: filas.filter(f => !f.p.is_active).length
  };

  const visibles = filas.filter(({ p, r }) => {
    if (filtro === 'faltan') return p.is_active && !r.listo;
    if (filtro === 'listos') return p.is_active && r.listo;
    if (filtro === 'inactivos') return !p.is_active;
    return true;
  });

  const desactivar = async (p) => {
    const ok = window.confirm(
      `¿Desactivar "${p.name}"?\n\nEl bot deja de ofrecerlo y de cobrarlo. Las ventas ya hechas se conservan y lo podés reactivar cuando quieras.`
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

  const nombreDe = (idProducto) => productos.find(x => Number(x.id) === Number(idProducto))?.name;

  return (
    <main className="pl">
      <header className="pl-top">
        <div>
          <h1>Productos</h1>
          <p>Lo que vende el bot por WhatsApp. Cada producto tiene su presentación, su extra, su entrega y su seguimiento.</p>
        </div>
        <button type="button" className="pe-btn pe-btn--primario" onClick={() => navigate('/productos/nuevo')}>
          Agregar producto
        </button>
      </header>

      {error && <div className="pe-alerta" role="alert">{error}</div>}

      <div className="pe-segmento pl-filtros" role="group" aria-label="Filtrar productos">
        {FILTROS.map(f => (
          <button key={f.id} type="button" className={filtro === f.id ? 'is-activo' : ''} onClick={() => setFiltro(f.id)}>
            {f.titulo} <span className="pl-filtros__n">{cuenta[f.id]}</span>
          </button>
        ))}
      </div>

      {cargando && <p className="pl-vacio">Cargando…</p>}

      {!cargando && productos.length === 0 && (
        <div className="pl-vacio">
          <p>Todavía no hay productos. Agregá el primero para que el bot tenga algo que ofrecer.</p>
          <button type="button" className="pe-btn pe-btn--primario" onClick={() => navigate('/productos/nuevo')}>Agregar producto</button>
        </div>
      )}

      {!cargando && productos.length > 0 && visibles.length === 0 && (
        <p className="pl-vacio">Ningún producto en este filtro.</p>
      )}

      <ul className="pl-lista">
        {visibles.map(({ p, r }) => {
          const extra = p.bump?.activo && !p.solo_extra ? nombreDe(p.bump.product_id) : null;
          return (
            <li key={p.id} className={`pl-item ${p.is_active ? '' : 'is-inactivo'}`}>
              {p.cover_url
                ? <img src={p.cover_url} alt="" className="pl-item__portada" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                : <div className="pl-item__portada pl-item__portada--vacia" aria-hidden="true" />}

              <div className="pl-item__info">
                <button type="button" className="pl-item__nombre" onClick={() => navigate(`/productos/${p.id}`)}>
                  {p.name}
                </button>
                <div className="pl-chips">
                  {!p.is_active && <span className="pe-chip">Inactivo</span>}
                  {p.is_active && r.listo && <span className="pe-chip pe-chip--ok">Listo para vender</span>}
                  {p.is_active && !r.listo && (
                    <span className="pe-chip pe-chip--falta">Falta: {r.faltan.map(f => f.texto.toLowerCase()).join(', ')}</span>
                  )}
                  {p.solo_extra && <span className="pe-chip pe-chip--info">Solo se vende como extra</span>}
                  {extra && (
                    <span className="pe-chip pe-chip--info">
                      Extra: {extra}{p.bump.precio ? ` +${formatearPrecio(p.bump.precio, p.currency)}` : ''}
                    </span>
                  )}
                  {!p.solo_extra && p.mensajes?.seguimiento?.activo === false && <span className="pe-chip">Seguimiento apagado</span>}
                </div>
              </div>

              <div className="pl-item__precio">
                <strong>{p.price_formatted || formatearPrecio(p.price, p.currency)}</strong>
                {p.precio_recuperacion ? <small>Recuperación {formatearPrecio(p.precio_recuperacion, p.currency)}</small> : null}
              </div>

              <div className="pl-item__acciones">
                <button type="button" className="pe-btn" onClick={() => navigate(`/productos/${p.id}`)}>Editar</button>
                <button type="button" className="pe-btn" onClick={() => navigate(`/productos/nuevo?desde=${p.id}`)}>Duplicar</button>
                {p.is_active
                  ? <button type="button" className="pe-btn pe-btn--quitar" onClick={() => desactivar(p)}>Desactivar</button>
                  : <button type="button" className="pe-btn" onClick={() => reactivar(p)}>Reactivar</button>}
              </div>
            </li>
          );
        })}
      </ul>

      {catalogo && productos.some(p => p.is_active && !p.solo_extra) && (
        <details className="pl-catalogo">
          <summary>Lista de precios que usa el bot</summary>
          <p className="pe-ayuda">Sale de los productos activos, en el orden de cada uno. Los que son solo extra no aparecen.</p>
          <div className="pl-catalogo__burbuja">{formatoWhatsApp(catalogo)}</div>
        </details>
      )}
    </main>
  );
}

export default ProductosPage;
