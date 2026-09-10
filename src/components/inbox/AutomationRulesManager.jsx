import React, { useState } from 'react';
import { automationRulesService } from '../services/automationRules.service';

export function AutomationRulesManager({ isOpen, onClose }) {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    triggers: [{ type: 'keyword', value: '' }],
    actions: [{ type: 'send_response', message: '' }]
  });

  React.useEffect(() => {
    if (isOpen) {
      setRules(automationRulesService.getRules());
    }
  }, [isOpen]);

  const handleCreateRule = () => {
    if (!newRule.name.trim()) {
      alert('Por favor ingresa un nombre para la regla');
      return;
    }

    const rule = automationRulesService.createRule(newRule);
    setRules([...rules, rule]);
    setNewRule({
      name: '',
      triggers: [{ type: 'keyword', value: '' }],
      actions: [{ type: 'send_response', message: '' }]
    });
    setShowForm(false);
  };

  const handleDeleteRule = (ruleId) => {
    if (confirm('¿Eliminar esta regla?')) {
      automationRulesService.deleteRule(ruleId);
      setRules(rules.filter(r => r.id !== ruleId));
    }
  };

  const handleToggleRule = (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    const updated = automationRulesService.updateRule(ruleId, { enabled: !rule.enabled });
    setRules(rules.map(r => r.id === ruleId ? updated : r));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog automation-modal">
        <div className="modal-header">
          <h2>⚙️ Reglas de Automatización</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content automation-content">
          {showForm ? (
            <div className="rule-form">
              <h3>Nueva Regla</h3>
              <input
                type="text"
                placeholder="Nombre de la regla"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                className="form-input"
              />

              <div className="form-section">
                <label>Disparador</label>
                <select
                  value={newRule.triggers[0]?.type || ''}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    triggers: [{ type: e.target.value, value: newRule.triggers[0]?.value || '' }]
                  })}
                  className="form-select"
                >
                  <option value="keyword">Contiene palabra</option>
                  <option value="exact_match">Coincidencia exacta</option>
                  <option value="starts_with">Comienza con</option>
                  <option value="regex">Expresión regular</option>
                </select>
                <input
                  type="text"
                  placeholder="Valor"
                  value={newRule.triggers[0]?.value || ''}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    triggers: [{ type: newRule.triggers[0]?.type || '', value: e.target.value }]
                  })}
                  className="form-input"
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div className="form-section">
                <label>Acción</label>
                <select
                  value={newRule.actions[0]?.type || ''}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    actions: [{ type: e.target.value, message: newRule.actions[0]?.message || '' }]
                  })}
                  className="form-select"
                >
                  <option value="send_response">Enviar respuesta</option>
                  <option value="add_tag">Agregar etiqueta</option>
                  <option value="assign_user">Asignar usuario</option>
                </select>
                <input
                  type="text"
                  placeholder="Mensaje / Etiqueta / Usuario"
                  value={newRule.actions[0]?.message || ''}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    actions: [{ type: newRule.actions[0]?.type || '', message: e.target.value }]
                  })}
                  className="form-input"
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div className="form-buttons">
                <button className="btn-save" onClick={handleCreateRule}>Crear Regla</button>
                <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <button className="btn-add-rule" onClick={() => setShowForm(true)}>
                ➕ Nueva Regla
              </button>

              <div className="rules-list">
                {rules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
                    No hay reglas de automatización
                  </div>
                ) : (
                  rules.map(rule => (
                    <div key={rule.id} className="rule-item">
                      <div className="rule-info">
                        <div className="rule-name">{rule.name}</div>
                        <div className="rule-meta">
                          {rule.triggers[0]?.type} → {rule.actions[0]?.type}
                        </div>
                      </div>
                      <div className="rule-actions">
                        <button
                          className={`toggle-btn ${rule.enabled ? 'enabled' : 'disabled'}`}
                          onClick={() => handleToggleRule(rule.id)}
                        >
                          {rule.enabled ? '✓' : '○'}
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <style>{`
          .automation-modal {
            max-width: 600px;
          }

          .automation-content {
            padding: 20px;
          }

          .rule-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .form-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .form-input, .form-select {
            padding: 8px 12px;
            border: 1px solid var(--border-light);
            border-radius: 4px;
            background: var(--bg-surface);
            color: var(--text);
            font-size: 13px;
          }

          .form-buttons {
            display: flex;
            gap: 8px;
          }

          .btn-save, .btn-cancel {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
          }

          .btn-save {
            background: var(--accent);
            color: white;
          }

          .btn-cancel {
            background: var(--bg-surface-2);
            color: var(--text);
            border: 1px solid var(--border-light);
          }

          .btn-add-rule {
            width: 100%;
            padding: 12px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
          }

          .rules-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .rule-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: var(--bg-surface-2);
            border: 1px solid var(--border-light);
            border-radius: 4px;
          }

          .rule-info {
            flex: 1;
          }

          .rule-name {
            font-size: 13px;
            font-weight: 600;
          }

          .rule-meta {
            font-size: 11px;
            color: var(--text-soft);
            margin-top: 4px;
          }

          .rule-actions {
            display: flex;
            gap: 8px;
          }

          .toggle-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            color: var(--text-soft);
          }

          .toggle-btn.enabled {
            color: var(--accent);
          }

          .btn-delete {
            background: none;
            border: none;
            color: #d32f2f;
            cursor: pointer;
            font-size: 16px;
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

export default AutomationRulesManager;
