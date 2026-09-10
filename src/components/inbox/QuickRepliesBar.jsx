import React, { useMemo } from 'react';
import { quickRepliesService } from '../../services/quickReplies.service';

/**
 * QuickRepliesBar Component
 * Muestra atajos de respuestas rápidas directamente en un solo clic sobre el input del chat.
 * Cada botón muestra el nombre del atajo (ej. "Saludo inicial", "¿Tiene CV previo?")
 * y al hacer clic inserta el mensaje completo en el campo de texto.
 */
export function QuickRepliesBar({
  platform,
  onSelectReply,
  onClose,
  onOpenManager,
  visible = true
}) {
  const replies = useMemo(() => {
    return quickRepliesService.getByPlatform(platform);
  }, [platform]);

  if (!visible || !replies || replies.length === 0) {
    return null;
  }

  return (
    <div className="quick-replies-bar">
      <div className="replies-header">
        <span className="bar-label">⚡ Atajos para CV</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onOpenManager && (
            <button
              type="button"
              className="quick-bar-settings-btn"
              onClick={onOpenManager}
              title="Configurar y crear atajos de CV"
            >
              ⚙
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="quick-bar-close-btn"
              onClick={onClose}
              title="Ocultar barra de atajos"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="replies-container">
        {replies.map(reply => {
          const shortcutTitle = reply.title || reply.shortcut || reply.label || (reply.text ? (reply.text.length > 20 ? reply.text.slice(0, 20) + '…' : reply.text) : 'Atajo');
          const replyText = reply.text || reply.message || '';
          return (
            <button
              key={reply.id}
              type="button"
              className="quick-reply-btn reply-item"
              onClick={() => onSelectReply(replyText, reply)}
              title={replyText}
            >
              <span className="reply-text">{shortcutTitle}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickRepliesBar;
