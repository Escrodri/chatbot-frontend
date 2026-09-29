import React from 'react';

/** *negrita* y _cursiva_ de WhatsApp, para que la vista previa se parezca a lo que llega. */
export function formatoWhatsApp(texto) {
  return String(texto || '').split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((trozo, i) => {
    if (/^\*[^*\n]+\*$/.test(trozo)) return <strong key={i}>{trozo.slice(1, -1)}</strong>;
    if (/^_[^_\n]+_$/.test(trozo)) return <em key={i}>{trozo.slice(1, -1)}</em>;
    return trozo;
  });
}

/**
 * Cómo le llega al cliente, en su celular.
 *
 * Lo que manda el bot va a la izquierda (así lo ve el cliente: le escribe el
 * negocio) y lo que toca el cliente, a la derecha. Los botones van debajo del
 * mensaje que los lleva, como en WhatsApp.
 *
 * @param {{
 *   titulo?: string,
 *   burbujas: Array<{ de?: 'bot'|'cliente'|'nota', texto?: string, imagen?: string, botones?: string[] }>,
 *   vacio?: string
 * }} props
 */
export function VistaWhatsApp({ titulo = 'Así le llega al cliente', burbujas = [], vacio = 'Escribí el mensaje para verlo acá.' }) {
  const hay = burbujas.some(b => b.texto || b.imagen);

  return (
    <figure className="wa-vista" aria-label={titulo}>
      <figcaption className="wa-vista__titulo">{titulo}</figcaption>
      <div className="wa-vista__chat">
        {!hay && <p className="wa-vista__vacio">{vacio}</p>}
        {hay && burbujas.map((b, i) => {
          if (b.de === 'nota') {
            return <div key={i} className="wa-vista__nota">{b.texto}</div>;
          }
          const lado = b.de === 'cliente' ? 'wa-vista__fila--cliente' : 'wa-vista__fila--bot';
          if (!b.texto && !b.imagen) return null;
          return (
            <div key={i} className={`wa-vista__fila ${lado}`}>
              <div className="wa-vista__grupo">
                <div className={`wa-vista__burbuja ${b.imagen && !b.texto ? 'wa-vista__burbuja--imagen' : ''}`}>
                  {b.imagen && (
                    <img
                      src={b.imagen}
                      alt=""
                      className="wa-vista__imagen"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  )}
                  {b.texto && <div className="wa-vista__texto">{formatoWhatsApp(b.texto)}</div>}
                </div>
                {Array.isArray(b.botones) && b.botones.length > 0 && (
                  <div className="wa-vista__botones">
                    {b.botones.map((t, j) => (
                      <span key={j} className="wa-vista__boton">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export default VistaWhatsApp;
