import React, { useState, useEffect } from 'react';
import { templatesService } from '../services/templates.service';

export function TemplatesList({ isOpen, onClose, onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    const loaded = await templatesService.loadTemplates();
    setTemplates(loaded);
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setVariables({});
  };

  const handleSendTemplate = () => {
    if (selectedTemplate) {
      const message = templatesService.replaceVariables(selectedTemplate, variables);
      onSelectTemplate(message, selectedTemplate.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog templates-modal">
        <div className="modal-header">
          <h2>📋 Plantillas de Mensaje</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content templates-content">
          {!selectedTemplate ? (
            <div className="templates-list">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="template-item"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="template-name">{template.name}</div>
                  <div className="template-preview">
                    {template.components[0]?.text?.substring(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="template-editor">
              <button
                className="btn-back"
                onClick={() => setSelectedTemplate(null)}
              >
                ← Atrás
              </button>

              <h3>{selectedTemplate.name}</h3>
              <p className="template-text">
                {selectedTemplate.components[0]?.text}
              </p>

              {selectedTemplate.variables.length > 0 && (
                <div className="variables-section">
                  <h4>Valores</h4>
                  {selectedTemplate.variables.map(variable => (
                    <input
                      key={variable}
                      type="text"
                      placeholder={`${variable}...`}
                      value={variables[variable] || ''}
                      onChange={(e) =>
                        setVariables({
                          ...variables,
                          [variable]: e.target.value
                        })
                      }
                      className="variable-input"
                    />
                  ))}
                </div>
              )}

              <button
                className="btn-send"
                onClick={handleSendTemplate}
              >
                Enviar Plantilla
              </button>
            </div>
          )}
        </div>

        <style>{`
          .templates-modal {
            max-width: 500px;
          }

          .templates-content {
            padding: 20px;
          }

          .templates-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .template-item {
            padding: 12px;
            background: var(--bg-surface-2);
            border: 1px solid var(--border-light);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .template-item:hover {
            border-color: var(--accent);
            background: var(--accent);
            color: white;
          }

          .template-name {
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 4px;
          }

          .template-preview {
            font-size: 12px;
            opacity: 0.7;
          }

          .template-editor {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .btn-back {
            background: none;
            border: 1px solid var(--border-light);
            padding: 6px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            align-self: flex-start;
          }

          .template-text {
            padding: 12px;
            background: var(--bg-surface-2);
            border-radius: 4px;
            line-height: 1.5;
            margin: 0;
            font-size: 13px;
          }

          .variables-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .variables-section h4 {
            margin: 0 0 8px 0;
            font-size: 12px;
            font-weight: 600;
          }

          .variable-input {
            padding: 8px 12px;
            border: 1px solid var(--border-light);
            border-radius: 4px;
            background: var(--bg-surface);
            color: var(--text);
            font-size: 13px;
          }

          .btn-send {
            padding: 10px 16px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
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
