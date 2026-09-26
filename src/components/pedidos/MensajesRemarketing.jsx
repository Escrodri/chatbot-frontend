import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { recoveryMessagesService } from '../../services/recovery-messages.service';

const DEFAULTS = {
  nivel_1_decidido: '¡Hola, {{nombre}}! 🤍\nTe escribo por las dudas: ¿tuviste algún inconveniente con la transferencia o necesitás ayuda con algún dato bancario?\nAvisame y te ayudo con gusto así tus peques ya pueden tener sus historias listas para colorear hoy mismo 🙌🏻✨',
  nivel_1_mirando: '¡Hola, {{nombre}}! 🤍\n¿Te quedó alguna duda con {{producto}}? Si querés te muestro unas páginas por dentro o me preguntás lo que necesites, con total confianza 🙌🏻',
  nivel_2_decidido: '¡Hola, {{nombre}}! 🤍\nSi lo que te frenó fue el monto, te lo puedo dejar en {{precio}}. ¿Te paso los datos así lo cerramos hoy mismo? 🙌🏻',
  nivel_2_mirando: '¡Hola, {{nombre}}! 🤍\nTe hago una propuesta especial: {{producto}} te lo puedo dejar hoy en {{precio}}. Si te interesa, decime y te paso los datos 🙌🏻',
  nivel_3: '¡Hola, {{nombre}}! No quiero insistir de más, así que te dejo esto simple:\n\nSi todavía querés {{producto}}, te lo dejo en {{precio}} y te paso los datos ahora mismo.\n\nY si no era para vos, todo bien igual. Acá quedo si algún día lo necesitás 🤍'
};

const estiloTextarea = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '7px',
  border: '1px solid var(--border-gold, #ddd)',
  fontSize: '.83rem',
  background: 'var(--bg-panel, transparent)',
  color: 'inherit',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  resize: 'vertical'
};

const estiloPildora = {
  display: 'inline-block',
  background: 'var(--bg-card, rgba(0,0,0,0.05))',
  border: '1px solid var(--border-gold, #ccc)',
  borderRadius: '4px',
  padding: '2px 6px',
  fontSize: '.72rem',
  marginRight: '6px',
  marginBottom: '4px',
  cursor: 'pointer',
  userSelect: 'none'
};

export function MensajesRemarketing() {
  const { token, user } = useAuth();
  const esAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [mensajes, setMensajes] = useState(DEFAULTS);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [abierto, setAbierto] = useState(false);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const data = await recoveryMessagesService.obtener(token);
      if (data?.messages) {
        setMensajes(data.messages);
      }
    } catch (err) {
      console.warn('No se pudieron leer mensajes de remarketing:', err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (abierto) {
      cargar();
    }
  }, [abierto, cargar]);

  const guardar = async (e) => {
    e?.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      await recoveryMessagesService.guardar(token, mensajes);
      setAviso({ ok: true, texto: 'Mensajes de remarketing actualizados correctamente.' });
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const restablecer = async () => {
    if (!window.confirm('¿Restablecer los mensajes de remarketing a sus valores recomendados por defecto?')) return;
    setGuardando(true);
    setAviso(null);
    try {
      const data = await recoveryMessagesService.restablecer(token);
      setMensajes(data.messages || DEFAULTS);
      setAviso({ ok: true, texto: 'Mensajes restablecidos a los valores por defecto.' });
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const insertarVariable = (campo, variable) => {
    setMensajes(prev => ({
      ...prev,
      [campo]: (prev[campo] || '') + ` ${variable}`
    }));
  };

  if (!esAdmin) return null;

  return (
    <div style={{ marginTop: '10px' }}>
      <button
        type="button"
        className="btn-card-action"
        style={{ fontSize: '.79rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        onClick={() => { setAbierto(a => !a); setAviso(null); }}
      >
        <span>{abierto ? '▲ Ocultar mensajes de remarketing' : '💬 Editar mensajes de remarketing / recuperación'}</span>
      </button>

      {abierto && (
        <div style={{
          marginTop: '12px',
          padding: '14px',
          border: '1px solid var(--border-gold, #e2e2e2)',
          borderRadius: '9px',
          background: 'var(--bg-card, rgba(255,255,255,0.03))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '.9rem', fontWeight: 700 }}>
                Mensajes de Recuperación y Remarketing Automático
              </h4>
              <p style={{ margin: 0, fontSize: '.75rem', color: 'var(--text-soft)' }}>
                Se envían automáticamente según el tiempo desde la última interacción del cliente (2h, 8h y 20h).
                Podés usar: <code style={{ color: 'var(--color-gold, #b45309)' }}>{'{{nombre}}'}</code>, <code style={{ color: 'var(--color-gold, #b45309)' }}>{'{{producto}}'}</code>, <code style={{ color: 'var(--color-gold, #b45309)' }}>{'{{precio}}'}</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={restablecer}
              disabled={guardando || cargando}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-gold, #ddd)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '.74rem',
                cursor: 'pointer',
                color: 'inherit'
              }}
            >
              Restablecer recomendados
            </button>
          </div>

          {aviso && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '.8rem',
              background: aviso.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: aviso.ok ? '#047857' : '#b91c1c'
            }}>
              {aviso.texto}
            </div>
          )}

          <form onSubmit={guardar} style={{ display: 'grid', gap: '14px' }}>
            {/* Nivel 1 - Decidido (Mensaje 5) */}
            <div style={{ padding: '10px', background: 'var(--bg-panel, rgba(0,0,0,0.02))', borderRadius: '7px', border: '1px solid var(--border-gold, #eee)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '.8rem', fontWeight: 700 }}>
                  ⏰ Recordatorio 1 (a las 2 horas) — Si pidió datos pero no pagó (Mensaje 5)
                </label>
                <div>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_1_decidido', '{{nombre}}')}>+ Nombre</span>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_1_decidido', '{{producto}}')}>+ Producto</span>
                </div>
              </div>
              <textarea
                rows={3}
                style={estiloTextarea}
                value={mensajes.nivel_1_decidido || ''}
                onChange={e => setMensajes(m => ({ ...m, nivel_1_decidido: e.target.value }))}
                placeholder="¡Hola, [Nombre]! 🤍 Te escribo por las dudas..."
              />
              <small style={{ display: 'block', fontSize: '.71rem', color: 'var(--text-soft)', marginTop: '3px' }}>
                Se envía a quien pidió la cuenta bancaria o tocó "Lo quiero ya" y pasaron 2 horas sin enviar comprobante.
              </small>
            </div>

            {/* Nivel 1 - Mirando */}
            <div style={{ padding: '10px', background: 'var(--bg-panel, rgba(0,0,0,0.02))', borderRadius: '7px', border: '1px solid var(--border-gold, #eee)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '.8rem', fontWeight: 700 }}>
                  ⏰ Recordatorio 1 (a las 2 horas) — Si solo miró o no pidió datos
                </label>
                <div>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_1_mirando', '{{nombre}}')}>+ Nombre</span>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_1_mirando', '{{producto}}')}>+ Producto</span>
                </div>
              </div>
              <textarea
                rows={3}
                style={estiloTextarea}
                value={mensajes.nivel_1_mirando || ''}
                onChange={e => setMensajes(m => ({ ...m, nivel_1_mirando: e.target.value }))}
              />
            </div>

            {/* Nivel 2 - Decidido con Oferta */}
            <div style={{ padding: '10px', background: 'var(--bg-panel, rgba(0,0,0,0.02))', borderRadius: '7px', border: '1px solid var(--border-gold, #eee)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '.8rem', fontWeight: 700 }}>
                  🔥 Remarketing 2 (a las 8 horas) — Oferta / Descuento especial
                </label>
                <div>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_2_decidido', '{{nombre}}')}>+ Nombre</span>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_2_decidido', '{{precio}}')}>+ Precio</span>
                </div>
              </div>
              <textarea
                rows={3}
                style={estiloTextarea}
                value={mensajes.nivel_2_decidido || ''}
                onChange={e => setMensajes(m => ({ ...m, nivel_2_decidido: e.target.value }))}
              />
              <small style={{ display: 'block', fontSize: '.71rem', color: 'var(--text-soft)', marginTop: '3px' }}>
                Se envía con el precio de recuperación cargado en el producto o el precio vigente con descuento.
              </small>
            </div>

            {/* Nivel 3 - Cierre */}
            <div style={{ padding: '10px', background: 'var(--bg-panel, rgba(0,0,0,0.02))', borderRadius: '7px', border: '1px solid var(--border-gold, #eee)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '.8rem', fontWeight: 700 }}>
                  🏁 Remarketing 3 (a las 20 horas) — Última llamada respetuosa
                </label>
                <div>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_3', '{{nombre}}')}>+ Nombre</span>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_3', '{{precio}}')}>+ Precio</span>
                  <span style={estiloPildora} onClick={() => insertarVariable('nivel_3', '{{producto}}')}>+ Producto</span>
                </div>
              </div>
              <textarea
                rows={4}
                style={estiloTextarea}
                value={mensajes.nivel_3 || ''}
                onChange={e => setMensajes(m => ({ ...m, nivel_3: e.target.value }))}
              />
              <small style={{ display: 'block', fontSize: '.71rem', color: 'var(--text-soft)', marginTop: '3px' }}>
                El último mensaje de la secuencia. Después de este, el sistema no vuelve a insistir.
              </small>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="submit"
                disabled={guardando}
                className="btn-card-action"
                style={{ padding: '7px 16px', fontSize: '.84rem', background: '#047857', color: '#fff', border: 'none' }}
              >
                {guardando ? 'Guardando…' : 'Guardar mensajes de remarketing'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default MensajesRemarketing;
