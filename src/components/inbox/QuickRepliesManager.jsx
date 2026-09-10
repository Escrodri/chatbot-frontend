import React, { useState, useEffect } from 'react';
import { quickRepliesService } from '../../services/quickReplies.service';

/**
 * QuickRepliesManager Component
 * Administrador y creador de atajos para el servicio de creación de CV.
 * Permite definir el nombre del atajo (ej. "Saludo") y el mensaje completo que enviará.
 */
export function QuickRepliesManager({ platform = 'whatsapp', isOpen, onClose, onSelectReply }) {
  const [replies, setReplies] = useState([]);
  const [shortcutTitle, setShortcutTitle] = useState('');
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    if (isOpen && platform) {
      setReplies(quickRepliesService.getByPlatform(platform));
    }
  }, [isOpen, platform]);

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleSave = (e) => {
    e?.preventDefault();
    const title = shortcutTitle.trim();
    const text = replyText.trim();

    if (!title) {
      alert('Por favor, ingresa el nombre del atajo (ej: Saludo, CV previo, etc.).');
      return;
    }
    if (!text) {
      alert('Por favor, ingresa el mensaje completo que se enviará.');
      return;
    }

    if (editingId) {
      quickRepliesService.updateQuickReply(platform, editingId, title, text);
      showFeedback('Atajo actualizado correctamente');
      setEditingId(null);
    } else {
      quickRepliesService.addQuickReply(platform, title, text);
      showFeedback('Atajo creado exitosamente');
    }

    setShortcutTitle('');
    setReplyText('');
    setReplies([...quickRepliesService.getByPlatform(platform)]);
  };

  const handleStartEdit = (reply) => {
    setEditingId(reply.id);
    setShortcutTitle(reply.title || '');
    setReplyText(reply.text || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setShortcutTitle('');
    setReplyText('');
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este atajo?')) {
      quickRepliesService.deleteQuickReply(platform, id);
      setReplies(quickRepliesService.getByPlatform(platform));
      if (editingId === id) {
        handleCancelEdit();
      }
      showFeedback('Atajo eliminado');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Deseas restaurar los atajos y preguntas predeterminadas para creación de CV?')) {
      const reset = quickRepliesService.resetToDefaults(platform);
      setReplies([...reset]);
      handleCancelEdit();
      showFeedback('Atajos de CV restaurados');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog quickreplies-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <h2>Atajos y Preguntas para Creación de CV</h2>
          </div>
          <button className="modal-close" onClick={onClose} title="Cerrar modal">✕</button>
        </div>

        <div className="modal-content quickreplies-content">
          {/* Formulario de creación y edición */}
          <form className="qr-form" onSubmit={handleSave}>
            <div className="form-header">
              <h3>{editingId ? '✏️ Modificar Atajo' : '➕ Crear Nuevo Atajo'}</h3>
              {feedbackMsg && <span className="feedback-badge">{feedbackMsg}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="qr-title-input">
                Nombre del Atajo <span className="field-hint">(lo que verás en el botón, ej: Saludo, CV previo, Educación)</span>:
              </label>
              <input
                id="qr-title-input"
                type="text"
                placeholder="Ej: Saludo inicial, ¿Tiene CV previo?, Experiencia laboral..."
                value={shortcutTitle}
                onChange={(e) => setShortcutTitle(e.target.value)}
                className="qr-input"
                maxLength={40}
              />
            </div>

            <div className="form-field">
              <label htmlFor="qr-text-input">
                Mensaje a Enviar <span className="field-hint">(el texto completo que se insertará al presionar el atajo)</span>:
              </label>
              <textarea
                id="qr-text-input"
                placeholder="Escribe el mensaje completo o pregunta útil para el cliente..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="qr-textarea"
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit-qr">
                {editingId ? '💾 Guardar Cambios' : '+ Agregar Atajo'}
              </button>
              {editingId && (
                <button type="button" className="btn-cancel-edit" onClick={handleCancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Listado de atajos */}
          <div className="qr-list-section">
            <div className="list-header-row">
              <h3>Atajos Configurados ({replies.length})</h3>
              <button
                type="button"
                className="btn-restore-defaults"
                onClick={handleResetDefaults}
                title="Recuperar las preguntas recomendadas para crear CV"
              >
                🔄 Restaurar Atajos de CV
              </button>
            </div>

            {replies.length === 0 ? (
              <div className="empty-state">
                No hay atajos guardados. Puedes agregar uno arriba o restaurar las preguntas recomendadas para CV.
              </div>
            ) : (
              <div className="qr-list">
                {replies.map((reply, index) => (
                  <div key={reply.id} className={`qr-item-card ${editingId === reply.id ? 'is-editing' : ''}`}>
                    <div className="qr-card-header">
                      <span className="qr-title-badge">
                        ⚡ {reply.title || 'Atajo'}
                      </span>
                      {index < 9 && (
                        <span className="qr-kbd-badge" title={`Atajo de teclado: Ctrl+${index + 1}`}>
                          Ctrl+{index + 1}
                        </span>
                      )}
                      <div className="qr-card-actions">
                        <button
                          type="button"
                          className="btn-card-use"
                          onClick={() => {
                            onSelectReply(reply.text, reply);
                            onClose();
                          }}
                          title="Insertar este mensaje en el chat y cerrar"
                        >
                          Usar
                        </button>
                        <button
                          type="button"
                          className="btn-card-edit"
                          onClick={() => handleStartEdit(reply)}
                          title="Editar nombre o mensaje"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-card-delete"
                          onClick={() => handleDelete(reply.id)}
                          title="Eliminar este atajo"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="qr-card-body">
                      {reply.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(11, 20, 26, 0.65);
            backdrop-filter: blur(2px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 16px;
          }

          .quickreplies-modal {
            background: var(--bg-panel);
            color: var(--text-strong);
            border-radius: 12px;
            box-shadow: var(--shadow-3);
            width: 100%;
            max-width: 680px;
            max-height: 88vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid var(--border);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: var(--bg-panel);
            border-bottom: 1px solid var(--border);
          }

          .modal-header h2 {
            margin: 0;
            font-size: 17px;
            font-weight: 700;
            color: var(--text-strong);
          }

          .modal-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-soft);
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.15s ease;
          }

          .modal-close:hover {
            background: var(--bg-hover);
            color: var(--text-strong);
          }

          .quickreplies-content {
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 22px;
          }

          .qr-form {
            background: var(--bg-hover);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 16px 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .form-header h3 {
            margin: 0;
            font-size: 14.5px;
            font-weight: 700;
            color: var(--wa-teal-dark);
          }

          [data-theme='dark'] .form-header h3 {
            color: var(--wa-teal);
          }

          .feedback-badge {
            font-size: 12px;
            color: #fff;
            background: var(--wa-teal);
            padding: 3px 8px;
            border-radius: 12px;
            animation: fadeIn 0.2s;
          }

          .form-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .form-field label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-strong);
          }

          .field-hint {
            font-weight: normal;
            font-size: 12px;
            color: var(--text-soft);
          }

          .qr-input, .qr-textarea {
            width: 100%;
            padding: 9px 12px;
            background: var(--bg-input);
            color: var(--text-strong);
            border: 1px solid var(--border-strong);
            border-radius: 6px;
            font-size: 13.5px;
            font-family: inherit;
            outline: none;
            transition: border-color 0.15s;
          }

          .qr-input:focus, .qr-textarea:focus {
            border-color: var(--wa-teal);
          }

          .qr-textarea {
            resize: vertical;
            line-height: 1.45;
          }

          .form-actions {
            display: flex;
            gap: 10px;
          }

          .btn-submit-qr {
            padding: 8px 18px;
            background: var(--wa-teal);
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s ease;
          }

          .btn-submit-qr:hover {
            background: var(--wa-teal-dark);
          }

          .btn-cancel-edit {
            padding: 8px 14px;
            background: transparent;
            color: var(--text-soft);
            border: 1px solid var(--border-strong);
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
          }

          .btn-cancel-edit:hover {
            background: var(--bg-hover);
            color: var(--text-strong);
          }

          .qr-list-section {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .list-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .list-header-row h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: var(--text-strong);
          }

          .btn-restore-defaults {
            background: none;
            border: 1px solid var(--border);
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 12px;
            color: var(--text-soft);
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-restore-defaults:hover {
            border-color: var(--wa-teal);
            color: var(--wa-teal);
          }

          .empty-state {
            padding: 24px;
            text-align: center;
            color: var(--text-soft);
            font-size: 13px;
            border: 1px dashed var(--border-strong);
            border-radius: 8px;
          }

          .qr-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .qr-item-card {
            background: var(--bg-panel);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            transition: border-color 0.15s;
          }

          .qr-item-card:hover {
            border-color: var(--border-strong);
          }

          .qr-item-card.is-editing {
            border-color: var(--wa-teal);
            background: rgba(0, 168, 132, 0.05);
          }

          .qr-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .qr-title-badge {
            font-weight: 700;
            font-size: 13px;
            color: var(--wa-teal-dark);
            background: rgba(0, 168, 132, 0.12);
            padding: 3px 8px;
            border-radius: 12px;
          }

          [data-theme='dark'] .qr-title-badge {
            color: var(--wa-teal);
          }

          .qr-kbd-badge {
            font-size: 11px;
            font-family: monospace;
            background: var(--bg-hover);
            color: var(--text-soft);
            border: 1px solid var(--border);
            padding: 2px 6px;
            border-radius: 4px;
          }

          .qr-card-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .btn-card-use {
            padding: 4px 10px;
            background: var(--wa-teal);
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s;
          }

          .btn-card-use:hover {
            background: var(--wa-teal-dark);
          }

          .btn-card-edit, .btn-card-delete {
            background: none;
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            color: var(--text-soft);
            transition: all 0.15s;
          }

          .btn-card-edit:hover {
            border-color: var(--wa-teal);
            color: var(--wa-teal);
          }

          .btn-card-delete:hover {
            border-color: #ef4444;
            color: #ef4444;
          }

          .qr-card-body {
            font-size: 13px;
            line-height: 1.45;
            color: var(--text-body);
            white-space: pre-wrap;
            word-break: break-word;
          }
        `}</style>
      </div>
    </div>
  );
}

export default QuickRepliesManager;
