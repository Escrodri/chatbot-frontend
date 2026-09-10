import React, { useState, useMemo } from 'react';
import { quickRepliesService } from '../../services/quickReplies.service';

/**
 * QuickRepliesSuggestions Component
 * Muestra sugerencias contextuales al escribir '/' o texto en el campo de mensajes.
 * Permite buscar atajos por su nombre o por su contenido.
 */
export function QuickRepliesSuggestions({
  platform,
  inputValue,
  onSelectReply,
  onClose,
  visible = true
}) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Obtener y filtrar atajos según lo escrito en el input
  const suggestions = useMemo(() => {
    const allReplies = quickRepliesService.getByPlatform(platform);
    
    if (!inputValue || inputValue.trim().length === 0) {
      return allReplies.slice(0, 6);
    }

    const query = inputValue.toLowerCase().replace(/^\//, '').trim();
    if (!query) {
      return allReplies.slice(0, 6);
    }

    return allReplies.filter(reply => {
      const text = (reply.text || reply.message || '').toLowerCase();
      const title = (reply.title || reply.label || reply.shortcut || '').toLowerCase();
      return text.includes(query) || title.includes(query);
    }).slice(0, 6);
  }, [platform, inputValue]);

  const handleSelectSuggestion = (reply) => {
    const text = reply.text || reply.message || '';
    onSelectReply(text, reply);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!visible || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setSelectedIndex(-1);
        if (onClose) onClose();
        break;
      default:
        break;
    }
  };

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      className="quick-replies-suggestions"
      onKeyDown={handleKeyDown}
    >
      <div className="suggestions-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="suggestions-label">⚡ Atajos de CV</span>
          <span className="suggestions-count">{suggestions.length}</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="suggestions-close-btn"
            onClick={onClose}
            title="Cerrar sugerencias (Esc)"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="suggestions-list">
        {suggestions.map((reply, index) => (
          <div
            key={reply.id}
            className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
            onClick={() => handleSelectSuggestion(reply)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="suggestion-icon">⚡</span>
            <div className="suggestion-content">
              <div className="suggestion-text" style={{ fontWeight: 600 }}>
                {reply.title || 'Atajo'}
              </div>
              <div className="suggestion-label">
                {reply.text || reply.message}
              </div>
            </div>
            <span className="suggestion-shortcut">Enter</span>
          </div>
        ))}
      </div>

      <div className="suggestions-footer">
        <span className="footer-hint">
          ↑↓ Navegar • Enter Seleccionar • Esc Cerrar
        </span>
      </div>
    </div>
  );
}

export default QuickRepliesSuggestions;
