import React, { useState, useMemo } from 'react';
import { quickRepliesService } from '../../services/quickReplies.service';

/**
 * QuickRepliesBar Component
 * Shows categorized quick reply buttons directly above the message input
 * No modal, instant selection
 */
export function QuickRepliesBar({
  platform,
  onSelectReply,
  onClose,
  onOpenManager,
  visible = true
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Categorize quick replies
  const categorizedReplies = useMemo(() => {
    const allReplies = quickRepliesService.getByPlatform(platform);
    
    const categories = {
      saludos: {
        label: 'Saludos',
        icon: '👋',
        replies: []
      },
      pago: {
        label: 'Pago',
        icon: '💳',
        replies: []
      },
      agradecimiento: {
        label: 'Gracias',
        icon: '🙏',
        replies: []
      },
      soporte: {
        label: 'Soporte',
        icon: '🆘',
        replies: []
      },
      disponible: {
        label: 'Disponible',
        icon: '✓',
        replies: []
      },
      otros: {
        label: 'Otros',
        icon: '➕',
        replies: []
      }
    };

    // Distribute replies to categories safely
    allReplies.forEach(reply => {
      const message = (reply.text || reply.message || '').toLowerCase();
      
      if (message.includes('hola') || message.includes('buenos') || message.includes('hoy') || message.includes('saludos')) {
        categories.saludos.replies.push(reply);
      } else if (message.includes('pago') || message.includes('tarjeta') || message.includes('transferencia') || message.includes('precio') || message.includes('costo') || message.includes('gs') || message.includes('guaran')) {
        categories.pago.replies.push(reply);
      } else if (message.includes('gracias') || message.includes('agradec') || message.includes('compra') || message.includes('orden')) {
        categories.agradecimiento.replies.push(reply);
      } else if (message.includes('ayuda') || message.includes('soport') || message.includes('problema') || message.includes('error') || message.includes('reclamo')) {
        categories.soporte.replies.push(reply);
      } else if (message.includes('disponible') || message.includes('stock') || message.includes('listo') || message.includes('horario') || message.includes('abierto')) {
        categories.disponible.replies.push(reply);
      } else {
        categories.otros.replies.push(reply);
      }
    });

    return categories;
  }, [platform]);

  const selectedCategoryData = selectedCategory ? categorizedReplies[selectedCategory] : null;
  const hasAnyReplies = Object.values(categorizedReplies).some(cat => cat.replies.length > 0);

  if (!visible || !hasAnyReplies) {
    return null;
  }

  // If a category is selected, show its replies
  if (selectedCategoryData && selectedCategoryData.replies.length > 0) {
    return (
      <div className="quick-replies-bar expanded">
        <div className="replies-header">
          <button 
            type="button"
            className="back-btn"
            onClick={() => setSelectedCategory(null)}
            title="Volver a categorías"
          >
            ← {selectedCategoryData.label}
          </button>
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
          {selectedCategoryData.replies.map(reply => {
            const replyText = reply.text || reply.message || '';
            return (
              <button
                key={reply.id}
                type="button"
                className="quick-reply-btn reply-item"
                onClick={() => {
                  onSelectReply(replyText, reply);
                  setSelectedCategory(null);
                }}
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

  // Show categories
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
        {Object.entries(categorizedReplies).map(([key, category]) => 
          category.replies.length > 0 && (
            <button
              key={key}
              type="button"
              className="quick-reply-btn category-btn"
              onClick={() => setSelectedCategory(key)}
              title={`${category.replies.length} ${category.label.toLowerCase()}`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.label}</span>
              <span className="category-count">{category.replies.length}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default QuickRepliesBar;

