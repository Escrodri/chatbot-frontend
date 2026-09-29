import React, { useRef } from 'react';
import { AYUDA_VARIABLES, VARIABLES_POR_PASO, variablesDesconocidas } from '../../lib/productoTextos';

/** "120 / 1024", en ámbar cerca del tope y en rojo pasado. */
export function Contador({ largo, tope }) {
  const estado = largo > tope ? 'pasado' : largo > tope * 0.85 ? 'cerca' : '';
  return (
    <span className={`pe-contador ${estado ? `pe-contador--${estado}` : ''}`} aria-live="polite">
      {largo}/{tope}
    </span>
  );
}

/**
 * Un mensaje del bot: el cuadro de texto, cuánto lleva, las variables que se
 * pueden usar en este paso y el aviso si alguna está mal escrita.
 *
 * La variable se inserta donde está el cursor, no al final: así es como se
 * escribe un mensaje de verdad.
 */
export function CampoMensaje({
  id,
  etiqueta,
  valor,
  onChange,
  onFocus,
  tope,
  paso,
  filas = 4,
  ayuda,
  placeholder,
  accion
}) {
  const ref = useRef(null);
  const variables = VARIABLES_POR_PASO[paso] || [];
  const malas = variablesDesconocidas(valor, paso);

  const insertar = (clave) => {
    const marca = `{{${clave}}}`;
    const el = ref.current;
    const actual = String(valor || '');
    if (!el) { onChange(`${actual}${marca}`); return; }
    const desde = el.selectionStart ?? actual.length;
    const hasta = el.selectionEnd ?? actual.length;
    const nuevo = actual.slice(0, desde) + marca + actual.slice(hasta);
    onChange(nuevo);
    requestAnimationFrame(() => {
      el.focus();
      const pos = desde + marca.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="pe-campo">
      <div className="pe-campo__cabeza">
        <label htmlFor={id} className="pe-etiqueta">{etiqueta}</label>
        <span className="pe-campo__lado">
          {accion}
          {tope ? <Contador largo={String(valor || '').length} tope={tope} /> : null}
        </span>
      </div>
      <textarea
        id={id}
        ref={ref}
        rows={filas}
        className="pe-input pe-textarea"
        value={valor || ''}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {variables.length > 0 && (
        <div className="pe-variables" aria-label="Insertar un dato">
          {variables.map(v => (
            <button
              key={v}
              type="button"
              className="pe-variable"
              title={AYUDA_VARIABLES[v]}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertar(v)}
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}
      {malas.length > 0 && (
        <p className="pe-error-campo">
          {malas.map(v => `{{${v}}}`).join(', ')} no existe en este paso: le llegaría al cliente tal cual.
        </p>
      )}
      {ayuda && <p className="pe-ayuda">{ayuda}</p>}
    </div>
  );
}

/** El texto de un botón de WhatsApp: una línea, hasta 20 letras. */
export function CampoBoton({ id, etiqueta, valor, onChange, tope = 20, ayuda }) {
  return (
    <div className="pe-campo">
      <div className="pe-campo__cabeza">
        <label htmlFor={id} className="pe-etiqueta">{etiqueta}</label>
        <Contador largo={String(valor || '').length} tope={tope} />
      </div>
      <input id={id} className="pe-input" value={valor || ''} onChange={(e) => onChange(e.target.value)} />
      {ayuda && <p className="pe-ayuda">{ayuda}</p>}
    </div>
  );
}

export default CampoMensaje;
