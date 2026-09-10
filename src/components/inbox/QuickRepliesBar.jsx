import React, { useMemo } from 'react';
import { quickRepliesService } from '../../services/quickReplies.service';

/**
 * QuickRepliesBar Component
 * Muestra únicamente los nombres de los atajos. Al hacer clic en un atajo,
 * inserta el mensaje correspondiente en el input y se cierra la barra.
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
              title="Configurar atajos"
            >
              ⚙
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="quick-bar-close-btn"
              onClick={onClose}
              title="Ocultar atajos"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="replies-container">
        {replies.map(reply => {
          const shortcutTitle = reply.title || reply.shortcut || reply.label || 'Atajo';
          const replyText = reply.text || reply.message || '';
          return (
            <button
              key={reply.id}
              type="button"
              className="quick-reply-btn reply-item"
              onClick={() => onSelectReply(replyText, reply)}
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
