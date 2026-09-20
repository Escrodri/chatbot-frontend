import React from 'react';
import { ESTADOS } from '../../services/orders.service';

/**
 * La etiqueta de venta de una conversación.
 *
 * Responde de un vistazo la pregunta que antes obligaba a abrir la planilla:
 * esta persona, ¿pagó o no? El estado que más importa es "Verificar" — significa
 * que mandó un comprobante y hay alguien esperando del otro lado — así que es el
 * único que va con un punto que llama la atención.
 */
export function OrderBadge({ status, compacto = false, titulo = null }) {
  if (!status) return null;

  const cfg = ESTADOS[status];
  if (!cfg) return null;

  const requiereAccion = status === 'comprobante_recibido';

  return (
    <span
      title={titulo || (requiereAccion ? 'Mandó comprobante: falta verificar el pago en el banco' : cfg.etiqueta)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: compacto ? '10px' : '11px',
        fontWeight: 700,
        lineHeight: 1,
        padding: compacto ? '3px 6px' : '4px 8px',
        borderRadius: '5px',
        color: cfg.color,
        background: cfg.fondo,
        border: `1px solid ${cfg.color}33`,
        whiteSpace: 'nowrap'
      }}
    >
      {requiereAccion && (
        <span
          aria-hidden="true"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: cfg.color,
            flexShrink: 0
          }}
        />
      )}
      {cfg.etiqueta}
    </span>
  );
}

export default OrderBadge;
