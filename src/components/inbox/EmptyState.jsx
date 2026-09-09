import React from 'react';

export function EmptyState() {
  return (
    <div className="inbox-empty-state">
      <svg className="empty-illustration" viewBox="0 0 300 200" fill="none" aria-hidden="true">
        <ellipse cx="150" cy="176" rx="96" ry="10" fill="currentColor" opacity="0.06" />
        <rect x="62" y="34" width="132" height="104" rx="14" fill="currentColor" opacity="0.10" />
        <path d="M96 138h26l-6 20z" fill="currentColor" opacity="0.10" />
        <rect x="82" y="60" width="74" height="9" rx="4.5" fill="currentColor" opacity="0.18" />
        <rect x="82" y="80" width="94" height="9" rx="4.5" fill="currentColor" opacity="0.14" />
        <rect x="82" y="100" width="56" height="9" rx="4.5" fill="currentColor" opacity="0.14" />
        <circle cx="212" cy="66" r="26" fill="currentColor" opacity="0.14" />
        <path d="M203 66l6.5 6.5L222 60" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>

      <h3>Bandeja Unificada</h3>
      <p>
        Elegí una conversación de la izquierda para responder. Acá llegan en tiempo real
        los mensajes de WhatsApp, Instagram Direct y Facebook Messenger.
      </p>

      <div className="empty-compliance-tag">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
          <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
        </svg>
        <span>Conexión cifrada · APIs oficiales de Meta</span>
      </div>
    </div>
  );
}

export default EmptyState;
