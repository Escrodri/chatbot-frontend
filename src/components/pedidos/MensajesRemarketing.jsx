import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { recoveryMessagesService } from '../../services/recovery-messages.service';

// Iguales a DEFAULT_MENSAJES_RECUPERACION del backend. Solo se ven un instante,
// hasta que llega lo guardado.
const DEFAULTS = {
  nivel_1_decidido: '¡Hola, {{nombre}}! 🤍\nTe escribo por si se complicó algo con la transferencia. ¿Querés que te pase de nuevo los datos?\n\nApenas me mandes la captura del comprobante, te llega {{producto}} por este mismo chat 🙌🏻',
  nivel_1_mirando: '¡Hola, {{nombre}}! 🤍\n¿Pudiste ver bien {{producto}}? Si te quedó alguna duda, preguntame lo que quieras.\n\nY si ya lo querés, decime y te paso los datos 🙌🏻',
  nivel_2_decidido: '¡Hola, {{nombre}}! 🤍\nSi lo que te frenó fue el monto, te lo puedo dejar en {{precio}}. Ese precio te lo mantengo hasta el {{vence}}.\n\n¿Te paso los datos? 📲',
  nivel_2_mirando: '¡Hola, {{nombre}}! 🤍\nTe quería hacer una propuesta: {{producto}} te lo dejo en {{precio}}, y ese precio te lo mantengo hasta el {{vence}}.\n\n¿Te interesa? Decime y te paso los datos 🙌🏻',
  nivel_2_sin_descuento: '¡Hola, {{nombre}}! 🤍\n¿Seguís con ganas de {{producto}}? Si hay algo que te frena, contame y lo vemos.\n\nSi ya lo querés, decime y te paso los datos 🙌🏻',
  nivel_3: '¡Hola, {{nombre}}! 🤍\nNo quiero insistir de más, así que te dejo esto simple: si todavía querés {{producto}}, te lo dejo en {{precio}} hasta el {{vence}} y te paso los datos ahora mismo.\n\nY si no era para vos, todo bien igual. Acá quedo si algún día lo necesitás.',
  nivel_3_sin_descuento: '¡Hola, {{nombre}}! 🤍\nNo quiero insistir de más, así que te dejo esto simple: si todavía querés {{producto}} a {{precio}}, decime y te paso los datos ahora mismo.\n\nY si no era para vos, todo bien igual. Acá quedo si algún día lo necesitás.'
};

const VARIABLES = {
  nombre: { etiqueta: 'Nombre', texto: '{{nombre}}' },
  producto: { etiqueta: 'Producto', texto: '{{producto}}' },
  precio: { etiqueta: 'Precio', texto: '{{precio}}' },
  vence: { etiqueta: 'Vence', texto: '{{vence}}' }
};

// Un bloque por texto, en el orden en que salen.
const CAMPOS = [
  {
    clave: 'nivel_1_decidido',
    titulo: '⏰ Recordatorio 1 (a las 2 horas) — pidió los datos pero no pagó',
    ayuda: 'Para quien tocó "Lo quiero" o pidió la cuenta y no mandó comprobante.',
    variables: ['nombre', 'producto'],
    filas: 3
  },
  {
    clave: 'nivel_1_mirando',
    titulo: '⏰ Recordatorio 1 (a las 2 horas) — solo miró',
    ayuda: 'Para quien vio el producto y no pidió los datos.',
    variables: ['nombre', 'producto'],
    filas: 3
  },
  {
    clave: 'nivel_2_decidido',
    titulo: '🏷️ Seguimiento 2 (a las 8 horas) — con precio de recuperación, pidió los datos',
    ayuda: 'Solo sale si el producto tiene precio de recuperación y es menor al que ya tiene esta persona. {{precio}} es ese precio rebajado y {{vence}} la fecha en que vence.',
    variables: ['nombre', 'producto', 'precio', 'vence'],
    filas: 3
  },
  {
    clave: 'nivel_2_mirando',
    titulo: '🏷️ Seguimiento 2 (a las 8 horas) — con precio de recuperación, solo miró',
    ayuda: 'Igual que el anterior, para quien no había pedido los datos.',
    variables: ['nombre', 'producto', 'precio', 'vence'],
    filas: 3
  },
  {
    clave: 'nivel_2_sin_descuento',
    titulo: '💬 Seguimiento 2 (a las 8 horas) — sin descuento',
    ayuda: 'Sale cuando no hay un precio más bajo para ofrecer. No digas "promo" ni "especial": el precio es el de siempre.',
    variables: ['nombre', 'producto', 'precio'],
    filas: 3
  },
  {
    clave: 'nivel_3',
    titulo: '🏁 Último mensaje (a las 20 horas) — con descuento',
    ayuda: 'El último de la secuencia. Después de este, el sistema no vuelve a insistir.',
    variables: ['nombre', 'producto', 'precio', 'vence'],
    filas: 4
  },
  {
    clave: 'nivel_3_sin_descuento',
    titulo: '🏁 Último mensaje (a las 20 horas) — sin descuento',
    ayuda: 'También para quien ya recibió el precio de recuperación en el mensaje anterior: {{precio}} es el que ya tiene.',
    variables: ['nombre', 'producto', 'precio'],
    filas: 4
  }
];

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
        setMensajes({ ...DEFAULTS, ...data.messages });
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
                Se envían automáticamente según el tiempo desde el último mensaje del cliente (2 h, 8 h y 20 h).
                Variables: <code style={{ color: 'var(--color-gold, #b45309)' }}>{'{{nombre}}'}</code>, <code style={{ color: 'var(--color-gold, #b45309)' }}>{'{{producto}}'}</code>, <code style={{ color: 'var(--color-gold, #b45309)' }}>{'{{precio}}'}</code> y <code style={{ color: 'var(--color-gold, #b45309)' }}>{'{{vence}}'}</code>.
                Un PDF no se agota: nada de cupos, lugares apartados ni "solo por hoy". La oferta vence cuando dice {'{{vence}}'}.
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
            {CAMPOS.map(campo => (
              <div
                key={campo.clave}
                style={{ padding: '10px', background: 'var(--bg-panel, rgba(0,0,0,0.02))', borderRadius: '7px', border: '1px solid var(--border-gold, #eee)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <label htmlFor={`remarketing-${campo.clave}`} style={{ fontSize: '.8rem', fontWeight: 700 }}>
                    {campo.titulo}
                  </label>
                  <div>
                    {campo.variables.map(v => (
                      <span key={v} style={estiloPildora} onClick={() => insertarVariable(campo.clave, VARIABLES[v].texto)}>
                        + {VARIABLES[v].etiqueta}
                      </span>
                    ))}
                  </div>
                </div>
                <textarea
                  id={`remarketing-${campo.clave}`}
                  rows={campo.filas}
                  style={estiloTextarea}
                  value={mensajes[campo.clave] || ''}
                  onChange={e => setMensajes(m => ({ ...m, [campo.clave]: e.target.value }))}
                />
                <small style={{ display: 'block', fontSize: '.71rem', color: 'var(--text-soft)', marginTop: '3px' }}>
                  {campo.ayuda}
                </small>
              </div>
            ))}

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
