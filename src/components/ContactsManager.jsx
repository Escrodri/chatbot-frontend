import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { contactsService } from '../services/contacts.service';
import { IconoDeCanal } from './Icons';
import { OrderBadge } from './inbox/OrderBadge';

const PLATAFORMAS = [
  { clave: 'all', etiqueta: 'Todos' },
  { clave: 'whatsapp', etiqueta: 'WhatsApp' },
  { clave: 'instagram', etiqueta: 'Instagram' },
  { clave: 'facebook', etiqueta: 'Messenger' }
];

/**
 * Directorio de contactos.
 *
 * Es solo lectura a propósito: un contacto existe porque alguien te escribió,
 * no porque alguien lo cargó. La versión anterior permitía crear, importar y
 * borrar contactos en localStorage — datos que no se correspondían con nadie
 * real y que nadie más en el equipo veía.
 */
export function ContactsManager({ onClose, onAbrirChat = null }) {
  const { token } = useAuth();

  const [contactos, setContactos] = useState([]);
  const [total, setTotal] = useState(null);
  const [plataforma, setPlataforma] = useState('all');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [lista, stats] = await Promise.all([
        contactsService.list(token, { platform: plataforma, search: busqueda || null }),
        contactsService.stats(token)
      ]);
      setContactos(Array.isArray(lista) ? lista : []);
      setTotal(stats?.total ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, plataforma, busqueda]);

  // Se espera a que deje de tipear antes de consultar, para no disparar una
  // búsqueda por cada tecla.
  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(t);
  }, [cargar, busqueda]);

  const formatearFecha = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const hoy = new Date().toDateString() === d.toDateString();
    return hoy
      ? d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const btn = {
    padding: '7px 13px', borderRadius: '7px', fontSize: '.83rem',
    border: '1px solid var(--border-gold, #ddd)', background: 'transparent',
    color: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap'
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 16px', overflowY: 'auto', zIndex: 1000
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card, #fff)', borderRadius: '12px',
        width: '100%', maxWidth: '860px', boxShadow: '0 12px 40px rgba(0,0,0,.2)',
        display: 'flex', flexDirection: 'column', maxHeight: '82vh'
      }}>
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 22px', borderBottom: '1px solid var(--border-gold, #eee)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Contactos</h3>
            <p style={{ margin: '3px 0 0', fontSize: '.82rem', color: 'var(--text-soft)' }}>
              {total !== null ? `${total} en total. ` : ''}Se agregan solos cuando alguien te escribe.
            </p>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-soft)', lineHeight: 1 }}>
            ×
          </button>
        </header>

        <div style={{ padding: '14px 22px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border-gold, #eee)' }}>
          {PLATAFORMAS.map(p => (
            <button key={p.clave} type="button"
              className={`filter-pill ${plataforma === p.clave ? 'active' : ''}`}
              onClick={() => setPlataforma(p.clave)}>
              {p.etiqueta}
            </button>
          ))}

          <input
            type="text"
            placeholder="Buscar por nombre o número…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-gold, #ddd)', background: 'var(--bg-card, #fff)', color: 'inherit' }}
          />

          <button type="button" style={btn}
            disabled={contactos.length === 0}
            onClick={() => contactsService.exportarCSV(contactos)}>
            Exportar CSV
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {error && (
            <p style={{ padding: '20px 22px', color: '#b91c1c', fontSize: '.88rem' }}>{error}</p>
          )}

          {cargando && !error && (
            <p style={{ padding: '30px 22px', textAlign: 'center', color: 'var(--text-soft)' }}>Cargando…</p>
          )}

          {!cargando && !error && contactos.length === 0 && (
            <p style={{ padding: '34px 22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '.9rem' }}>
              {busqueda ? 'Nadie coincide con esa búsqueda.' : 'Todavía no hay contactos.'}
            </p>
          )}

          {!cargando && contactos.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 22px', borderBottom: '1px solid var(--border-gold, #f0f0f0)'
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--bg-soft, #eee)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                overflow: 'hidden'
              }}>
                {c.avatar_url
                  ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  : (c.name || '?').charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <strong style={{ fontSize: '.9rem' }}>{c.name || 'Sin nombre'}</strong>
                  <IconoDeCanal platform={c.platform} size={13} />
                  {c.order_status && <OrderBadge status={c.order_status} compacto />}
                </div>
                <div style={{ fontSize: '.79rem', color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.phone_or_username || c.platform_user_id}
                  {c.last_message_text ? ` · ${c.last_message_text}` : ''}
                </div>
              </div>

              <span style={{ fontSize: '.77rem', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                {formatearFecha(c.last_message_time)}
              </span>

              {onAbrirChat && c.conversation_id && (
                <button type="button" style={btn}
                  onClick={() => { onAbrirChat(c.conversation_id); onClose(); }}>
                  Abrir chat
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ContactsManager;
