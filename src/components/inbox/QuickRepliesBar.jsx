import React, { useMemo } from 'react';
import { quickRepliesService } from '../../services/quickReplies.service';

/**
 * QuickRepliesBar Component
 * Muestra respuestas rápidas directamente en un solo clic sobre el input del chat.
 * No requiere navegar por categorías.
 */
export function QuickRepliesBar({
  platform,
  onSelectReply,
  onClose,
  onOpenManager,
  visible = true
}) {
  // Obtener respuestas rápidas directas de la plataforma
  const replies = useMemo(() => {
    return quickRepliesService.getByPlatform(platform);
  }, [platform]);

  if (!visible || !replies || replies.length === 0) {
    return null;
  }

  return (
    <div className="quick-replies-bar">
      <div className="replies-header">
        <span className="bar-label">⚡ Respuestas Rápidas</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onOpenManager && (
            <button
              type="button"
              className="quick-bar-settings-btn"
              onClick={onOpenManager}
              title="Administrar respuestas rápidas"
            >
              ⚙
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="quick-bar-close-btn"
              onClick={onClose}
              title="Ocultar barra de respuestas rápidas"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="replies-container">
        {replies.map(reply => {
          const replyText = reply.text || reply.message || '';
          return (
            <button
              key={reply.id}
              type="button"
              className="quick-reply-btn reply-item"
              onClick={() => onSelectReply(replyText, reply)}
              title={replyText}
            >
              <span className="reply-text">{replyText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickRepliesBar;
