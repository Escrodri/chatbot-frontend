import React, { useState, useEffect } from 'react';
import { quickRepliesService } from '../services/quickReplies.service';

export function QuickRepliesManager({ platform, isOpen, onClose, onSelectReply }) {
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');

  useEffect(() => {
    if (isOpen && platform) {
      setReplies(quickRepliesService.getByPlatform(platform));
    }
  }, [isOpen, platform]);

  const handleAddReply = () => {
    if (!newReply.trim()) return;
    const reply = quickRepliesService.addQuickReply(platform, newReply);
    setReplies([...replies, reply]);
    setNewReply('');
  };

  const handleDeleteReply = (id) => {
    quickRepliesService.deleteQuickReply(platform, id);
    setReplies(replies.filter(r => r.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog quickreplies-modal">
        <div className="modal-header">
          <h2>⚡ Respuestas Rápidas</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content quickreplies-content">
          <div className="qr-form">
            <textarea
              placeholder="Escribe una respuesta rápida..."
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              className="qr-textarea"
              rows="3"
            />
            <button className="btn-add-qr" onClick={handleAddReply}>
              Agregar Respuesta
            </button>
          </div>

          <div className="qr-list">
            <h3>Mis Respuestas (Ctrl+1-9)</h3>
            {replies.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)' }}>
                No hay respuestas rápidas
              </div>
            ) : (
              replies.map((reply, index) => (
                <div key={reply.id} className="qr-item">
                  <div className="qr-shortcut">Ctrl+{index + 1}</div>
                  <div className="qr-text">{reply.text}</div>
                  <button
                    className="btn-use"
                    onClick={() => {
                      onSelectReply(reply.text);
                      onClose();
                    }}
                  >
                    Usar
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteReply(reply.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <style>{`
          .quickreplies-modal {
            max-width: 500px;
          }

          .quickreplies-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 20px;
          }

          .qr-form {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .qr-textarea {
            padding: 12px;
            border: 1px solid var(--border-light);
            border-radius: 4px;
            background: var(--bg-surface);
            color: var(--text);
            font-size: 13px;
            font-family: inherit;
            resize: vertical;
          }

          .btn-add-qr {
            padding: 10px 16px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
          }

          .qr-list h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
          }

          .qr-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: var(--bg-surface-2);
            border: 1px solid var(--border-light);
            border-radius: 4px;
          }

          .qr-shortcut {
            font-size: 11px;
            font-weight: 600;
            padding: 4px 8px;
            background: var(--accent);
            color: white;
            border-radius: 3px;
            white-space: nowrap;
          }

          .qr-text {
            flex: 1;
            font-size: 13px;
          }

          .btn-use, .btn-delete {
            background: none;
            border: 1px solid var(--border-light);
            border-radius: 3px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 11px;
          }

          .btn-use {
            color: var(--accent);
          }

          .btn-delete {
            color: #d32f2f;
          }

          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-dialog {
            background: var(--bg-surface);
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            width: 90%;
            max-height: 90vh;
            overflow: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid var(--border-light);
          }

          .modal-header h2 {
            margin: 0;
            font-size: 18px;
          }

          .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-soft);
          }
        `}</style>
      </div>
    </div>
  );
}

export default QuickRepliesManager;
