import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tagsService, COLORES } from '../../services/tags.service';

/**
 * Selector de etiquetas de una conversación.
 *
 * Se tocan para poner y quitar. Lo que se marque acá lo ve todo el equipo,
 * porque vive en la base y no en este navegador.
 */
export function TagPicker({ conversationId, onCambio = null }) {
  const { token } = useAuth();

  const [disponibles, setDisponibles] = useState([]);
  const [puestas, setPuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [colorNuevo, setColorNuevo] = useState(COLORES[0]);

  const cargar = useCallback(async () => {
    if (!conversationId) return;
    setCargando(true);
    setError(null);
    try {
      const [catalogo, actuales] = await Promise.all([
        tagsService.list(token),
        tagsService.deConversacion(token, conversationId)
      ]);
      setDisponibles(Array.isArray(catalogo) ? catalogo : []);
      setPuestas(Array.isArray(actuales) ? actuales : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, conversationId]);

  useEffect(() => { cargar(); }, [cargar]);

  const estaPuesta = (id) => puestas.some(t => t.id === id);

  const alternar = async (tag) => {
    try {
      const nuevas = estaPuesta(tag.id)
        ? await tagsService.quitar(token, conversationId, tag.id)
        : await tagsService.poner(token, conversationId, tag.id);
      setPuestas(nuevas);
      if (onCambio) onCambio(nuevas);
    } catch (err) {
      setError(err.message);
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    if (!nombreNuevo.trim()) return;
    try {
      const creada = await tagsService.create(token, { name: nombreNuevo.trim(), color: colorNuevo });
      setNombreNuevo('');
      setCreando(false);
      setDisponibles(prev => [...prev.filter(t => t.id !== creada.id), creada]);
      await alternar(creada);
    } catch (err) {
      setError(err.message);
    }
  };

  if (cargando) {
    return <p style={{ fontSize: '.82rem', color: 'var(--text-soft)' }}>Cargando etiquetas…</p>;
  }

  return (
    <div>
      {error && (
        <p style={{ fontSize: '.8rem', color: '#b91c1c', marginTop: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        {disponibles.map(tag => {
          const activa = estaPuesta(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => alternar(tag)}
              title={activa ? 'Quitar esta etiqueta' : 'Poner esta etiqueta'}
              style={{
                fontSize: '.78rem', fontWeight: 600, padding: '4px 10px',
                borderRadius: '20px', cursor: 'pointer',
                border: `1px solid ${tag.color}`,
                background: activa ? tag.color : 'transparent',
                color: activa ? '#fff' : tag.color
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>

      {creando ? (
        <form onSubmit={crear} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            autoFocus
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre de la etiqueta"
            maxLength={60}
            style={{ padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border-gold, #ddd)', fontSize: '.85rem', background: 'var(--bg-card, #fff)', color: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {COLORES.map(c => (
              <button key={c} type="button" onClick={() => setColorNuevo(c)}
                aria-label={`Color ${c}`}
                style={{
                  width: '22px', height: '22px', borderRadius: '50%', background: c,
                  border: colorNuevo === c ? '2px solid var(--text, #222)' : '2px solid transparent',
                  cursor: 'pointer'
                }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '7px' }}>
            <button type="submit" style={{
              fontSize: '.8rem', padding: '6px 12px', borderRadius: '6px', border: 'none',
              background: 'var(--wa-teal, #00a884)', color: '#fff', fontWeight: 600, cursor: 'pointer'
            }}>
              Crear y poner
            </button>
            <button type="button" onClick={() => { setCreando(false); setNombreNuevo(''); }}
              style={{ fontSize: '.8rem', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-gold, #ddd)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setCreando(true)}
          style={{ fontSize: '.8rem', padding: '5px 11px', borderRadius: '6px', border: '1px dashed var(--border-gold, #ccc)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
          Nueva etiqueta
        </button>
      )}

      <p style={{ margin: '10px 0 0', fontSize: '.73rem', color: 'var(--text-soft)', lineHeight: 1.45 }}>
        Las ve todo el equipo, desde cualquier dispositivo.
      </p>
    </div>
  );
}

export default TagPicker;
