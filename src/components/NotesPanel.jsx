import React, { useState, useEffect } from 'react';
import { conversationNotesService } from '../services/conversationNotes.service';

export function NotesPanel({ conversationId, contactName, onClose }) {
  const [note, setNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [customName, setCustomName] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (conversationId) {
      const loaded = conversationNotesService.getOrCreateNote(conversationId, contactName);
      setNote(loaded);
      setNoteText(loaded.notes);
      setCustomName(loaded.customName || '');
    }
  }, [conversationId, contactName]);

  const handleSaveNote = () => {
    if (conversationId) {
      const updated = conversationNotesService.saveNote(conversationId, contactName, noteText);
      setNote(updated);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !conversationId) return;
    const updated = conversationNotesService.addTag(conversationId, newTag);
    setNote(updated);
    setNewTag('');
  };

  const handleRemoveTag = (tag) => {
    if (conversationId) {
      const updated = conversationNotesService.removeTag(conversationId, tag);
      setNote(updated);
    }
  };

  const handleSaveCustomName = () => {
    if (conversationId && customName.trim()) {
      const updated = conversationNotesService.setCustomName(conversationId, customName);
      setNote(updated);
    }
  };

  if (!note) return null;

  return (
    <div className="notes-panel">
      <div className="panel-header">
        <h3>Notas</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        <div className="section">
          <label>Nombre Personalizado</label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={contactName}
            className="text-input"
          />
          <button className="btn-save" onClick={handleSaveCustomName}>
            Guardar
          </button>
        </div>

        <div className="section">
          <label>Etiquetas</label>
          <div className="tags-list">
            {note.tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
                <button
                  className="tag-remove"
                  onClick={() => handleRemoveTag(tag)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="tag-input-row">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Nueva etiqueta"
              className="text-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAddTag();
              }}
            />
            <button className="btn-add" onClick={handleAddTag}>
              +
            </button>
          </div>
        </div>

        <div className="section">
          <label>Notas</label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escribe notas sobre este contacto..."
            className="notes-textarea"
            rows="6"
          />
          <button className="btn-save" onClick={handleSaveNote}>
            Guardar Notas
          </button>
        </div>
      </div>

      <style>{`
        .notes-panel {
          width: 280px;
          height: 100%;
          border-left: 1px solid var(--border-light);
          background: var(--bg-surface);
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-light);
        }

        .panel-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: var(--text-soft);
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .section label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-soft);
        }

        .text-input {
          padding: 6px 8px;
          border: 1px solid var(--border-light);
          border-radius: 3px;
          background: var(--bg-surface-2);
          color: var(--text);
          font-size: 12px;
        }

        .notes-textarea {
          padding: 8px;
          border: 1px solid var(--border-light);
          border-radius: 3px;
          background: var(--bg-surface-2);
          color: var(--text);
          font-size: 12px;
          font-family: inherit;
          resize: vertical;
        }

        .btn-save {
          padding: 6px 12px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: var(--accent);
          color: white;
          border-radius: 3px;
          font-size: 11px;
        }

        .tag-remove {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          font-size: 10px;
        }

        .tag-input-row {
          display: flex;
          gap: 4px;
        }

        .tag-input-row .text-input {
          flex: 1;
        }

        .btn-add {
          padding: 6px 8px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          width: 32px;
        }
      `}</style>
    </div>
  );
}
