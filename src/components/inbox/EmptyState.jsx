import React from 'react';

export function EmptyState() {
  return (
    <div className="inbox-empty-state">
      <div className="empty-crystal-ball">🔮</div>
      <h3>Lecturas de Tarot • Atención Omnicanal</h3>
      <p>
        Selecciona una conversación de la columna izquierda para atender las consultas de tus clientes
        en tiempo real desde WhatsApp Cloud API, Instagram Direct o Facebook Messenger.
      </p>

      <div className="empty-compliance-tag">
        <span>🔒</span>
        <span>Cifrado de extremo a extremo • Cumplimiento oficial Meta Graph API v21.0</span>
      </div>
    </div>
  );
}

export default EmptyState;
