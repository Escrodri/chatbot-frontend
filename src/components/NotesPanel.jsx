import React, { useState, useEffect } from 'react';
import { TagPicker } from './inbox/TagPicker';
import { conversationNotesService } from '../services/conversationNotes.service';
import { IconoEditar, IconoEliminar, IconoAgregar } from './Icons';

/**
 * Panel lateral de notas y etiquetas de una conversación.
 *
 * Dos cosas distintas conviven acá. Las NOTAS son privadas del equipo y no las
 * ve el cliente: sirven para dejar escrito lo que no entra en ningún estado,
 * del tipo "pidió factura a nombre de la escuela" o "avisó que paga el viernes".
 * Las ETIQUETAS son compartidas por todo el equipo y viven en la base, así que
 * lo que marque uno lo ve el resto; son para clasificar y después filtrar la
 * bandeja.
 *
 * Recibe la conversación entera, no solo el id: necesita el nombre y el
 * teléfono para el bloque de contacto. Antes la bandeja le pasaba
 * `conversationId` suelto, así que `conversation` llegaba indefinido, el
 * componente se cortaba en el `if (!conversation)` de abajo y el panel se abría
 * vacío. Ese era el motivo de que el botón pareciera muerto.
 */
export function NotesPanel({ conversation, onClose = null }) {
  const [noteText, setNoteText] = useState('');
  const [tags, setTags] = useState([]);
  const [contactName, setContactName] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isRenamingContact, setIsRenamingContact] = useState(false);

  const conversationId = conversation?.id;
  const availableTags = conversationNotesService.getPredefinedTags();

  // Load notes on conversation change
  useEffect(() => {
    if (!conversationId) return;

    const data = conversationNotesService.getConversationData(conversationId);
    setNoteText(data.noteText);
    setTags(conversationNotesService.getTags(conversationId));
    setContactName(
      conversationNotesService.getDisplayName(
        conversationId,
        conversation?.contact_name || conversation?.phone_number
      )
    );
  }, [conversationId, conversation?.contact_name, conversation?.phone_number]);

  const handleSaveNote = () => {
    if (conversationId) {
      conversationNotesService.updateNoteText(conversationId, noteText);
      setIsEditingNote(false);
    }
  };

  const handleToggleTag = (tagId) => {
    if (conversationId) {
      if (conversationNotesService.hasTag(conversationId, tagId)) {
        conversationNotesService.removeTag(conversationId, tagId);
      } else {
        conversationNotesService.addTag(conversationId, tagId);
      }
      setTags(conversationNotesService.getTags(conversationId));
    }
  };

  const handleSaveContactName = () => {
    if (conversationId) {
      conversationNotesService.setCustomName(conversationId, contactName);
      setIsRenamingContact(false);
    }
  };

  if (!conversation) {
    return null;
  }

  return (
    <div className="notes-panel">
      <div className="notes-panel-content">
        {onClose && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '.95rem' }}>Notas y etiquetas</strong>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '.82rem', textDecoration: 'underline', color: 'inherit', padding: '4px'
              }}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Contact Name Section */}
        <div className="notes-section">
          <h4 className="section-title">Contacto</h4>
          {isRenamingContact ? (
            <div className="name-edit">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nombre del contacto"
                autoFocus
              />
              <div className="button-group">
                <button className="btn-small btn-primary" onClick={handleSaveContactName}>
                  Guardar
                </button>
                <button
                  className="btn-small"
                  onClick={() => {
                    setIsRenamingContact(false);
                    setContactName(
                      conversationNotesService.getDisplayName(
                        conversationId,
                        conversation?.contact_name || conversation?.phone_number
                      )
                    );
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="name-display">
              <p>{contactName}</p>
              <button
                className="btn-icon-small"
                onClick={() => setIsRenamingContact(true)}
                title="Renombrar contacto"
              >
                <IconoEditar size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Etiquetas: viven en la base y las comparte todo el equipo */}
        <div className="notes-section">
          <h4 className="section-title">Etiquetas</h4>
          <TagPicker conversationId={conversationId} />
        </div>

        {/* Notes Section */}
        <div className="notes-section">
          <div className="section-header">
            <h4 className="section-title">Notas</h4>
            {!isEditingNote && noteText && (
              <button
                className="btn-icon-small"
                onClick={() => setIsEditingNote(true)}
                title="Editar nota"
              >
                <IconoEditar size={14} />
              </button>
            )}
          </div>

          {isEditingNote ? (
            <div className="note-edit">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escribe notas sobre este cliente..."
                rows={6}
              />
              <div className="button-group">
                <button className="btn-small btn-primary" onClick={handleSaveNote}>
                  Guardar nota
                </button>
                <button
                  className="btn-small"
                  onClick={() => {
                    setIsEditingNote(false);
                    setNoteText(
                      conversationNotesService.getNoteText(conversationId)
                    );
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : noteText ? (
            <div className="note-display">
              <p>{noteText}</p>
            </div>
          ) : (
            <button
              className="btn-add-note"
              onClick={() => setIsEditingNote(true)}
            >
              <IconoAgregar size={16} /> Agregar nota
            </button>
          )}
        </div>
      </div>

      <style>{`
        .notes-panel {
          width: 280px;
          background: var(--bg-surface-2);
          border-left: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .notes-panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .notes-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-title {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-soft);
        }

        /* Contact Name */
        .name-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .name-display p {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          flex: 1;
          word-break: break-word;
        }

        .name-edit {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .name-edit input {
          padding: 8px;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          font-size: 13px;
        }

        /* Tags */
        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag-button {
          padding: 6px 10px;
          border-radius: 4px;
          border: 1px solid transparent;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background: white;
          color: var(--text-soft);
          border: 1px solid var(--border-light);
          transition: all 0.2s;
        }

        .tag-button.active {
          background: var(--tag-bg);
          color: var(--tag-color);
          border-color: var(--tag-color);
          font-weight: 600;
        }

        .tag-button:hover {
          border-color: var(--tag-color);
        }

        /* Notes */
        .note-display {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: 4px;
          padding: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text);
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 200px;
          overflow-y: auto;
        }

        .note-edit {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .note-edit textarea {
          padding: 10px;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          font-family: var(--body-font);
          font-size: 13px;
          resize: vertical;
        }

        .btn-add-note {
          background: var(--bg-surface);
          border: 1px dashed var(--border-light);
          border-radius: 4px;
          padding: 10px;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-add-note:hover {
          background: var(--accent-light);
          border-color: var(--accent);
          color: var(--accent);
        }

        .button-group {
          display: flex;
          gap: 6px;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          background: var(--bg-surface);
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-small:hover {
          background: var(--bg-surface-2);
        }

        .btn-small.btn-primary {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .btn-small.btn-primary:hover {
          opacity: 0.9;
        }

        .btn-icon-small {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--text-soft);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-icon-small:hover {
          color: var(--text);
        }

        @media (max-width: 1024px) {
          .notes-panel {
            width: 240px;
          }
        }

        @media (max-width: 768px) {
          .notes-panel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default NotesPanel;
