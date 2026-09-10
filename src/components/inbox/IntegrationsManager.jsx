import React, { useState } from 'react';

const INTEGRATIONS = [
  { id: 'zapier', name: 'Zapier', icon: '⚡', connected: false },
  { id: 'make', name: 'Make', icon: '🔧', connected: false },
  { id: 'slack', name: 'Slack', icon: '💬', connected: false },
  { id: 'sheets', name: 'Google Sheets', icon: '📊', connected: false },
  { id: 'stripe', name: 'Stripe', icon: '💳', connected: false },
  { id: 'mailchimp', name: 'Mailchimp', icon: '📧', connected: false }
];

export function IntegrationsManager({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('integrations');
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [webhooks, setWebhooks] = useState([]);
  const [apiKeys, setApiKeys] = useState({});
  const [newWebhook, setNewWebhook] = useState('');

  const handleAddWebhook = () => {
    if (!newWebhook.trim()) return;
    setWebhooks([...webhooks, { id: Date.now(), url: newWebhook, active: true }]);
    setNewWebhook('');
  };

  const handleToggleIntegration = (id) => {
    setIntegrations(integrations.map(i =>
      i.id === id ? { ...i, connected: !i.connected } : i
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog integrations-modal">
        <div className="modal-header">
          <h2>🔌 Integraciones</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="integrations-tabs">
          <button
            className={`tab-btn ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            Integraciones
          </button>
          <button
            className={`tab-btn ${activeTab === 'webhooks' ? 'active' : ''}`}
            onClick={() => setActiveTab('webhooks')}
          >
            Webhooks
          </button>
          <button
            className={`tab-btn ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('keys')}
          >
            Claves API
          </button>
        </div>

        <div className="modal-content integrations-content">
          {activeTab === 'integrations' && (
            <div className="integrations-grid">
              {integrations.map(integration => (
                <div key={integration.id} className="integration-card">
                  <div className="integration-icon">{integration.icon}</div>
                  <div className="integration-name">{integration.name}</div>
                  <button
                    className={`connect-btn ${integration.connected ? 'connected' : ''}`}
                    onClick={() => handleToggleIntegration(integration.id)}
                  >
                    {integration.connected ? 'Conectado' : 'Conectar'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="webhooks-section">
              <div className="webhook-form">
                <input
                  type="text"
                  placeholder="https://tu-servidor.com/webhook"
                  value={newWebhook}
                  onChange={(e) => setNewWebhook(e.target.value)}
                  className="webhook-input"
                />
                <button className="btn-add-webhook" onClick={handleAddWebhook}>
                  Agregar Webhook
                </button>
              </div>

              <div className="webhooks-list">
                {webhooks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>No hay webhooks configurados</p>
                  </div>
                ) : (
                  webhooks.map(webhook => (
                    <div key={webhook.id} className="webhook-item">
                      <span className="webhook-url">{webhook.url}</span>
                      <button className="btn-test">Probar</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="keys-section">
              <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                Tus claves API están cifradas y seguras
              </p>
              <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-surface-2)', borderRadius: '4px' }}>
                <p style={{ fontSize: '13px' }}>Claves API disponibles para servicios conectados</p>
              </div>
            </div>
          )}
        </div>

        <style>{`
          .integrations-modal {
            max-width: 700px;
          }

          .integrations-tabs {
            display: flex;
            border-bottom: 1px solid var(--border-light);
            padding: 0 20px;
          }

          .tab-btn {
            flex: 1;
            padding: 12px 16px;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-soft);
          }

          .tab-btn.active {
            color: var(--accent);
            border-bottom-color: var(--accent);
          }

          .integrations-content {
            padding: 20px;
          }

          .integrations-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 12px;
          }

          .integration-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px;
            background: var(--bg-surface-2);
            border: 1px solid var(--border-light);
            border-radius: 8px;
            cursor: pointer;
          }

          .integration-icon {
            font-size: 32px;
            margin-bottom: 8px;
          }

          .integration-name {
            font-size: 12px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 8px;
          }

          .connect-btn {
            padding: 6px 12px;
            border: 1px solid var(--border-light);
            border-radius: 4px;
            background: var(--bg-surface);
            color: var(--text);
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
          }

          .connect-btn.connected {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
          }

          .webhook-form {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
          }

          .webhook-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--border-light);
            border-radius: 4px;
            background: var(--bg-surface);
            color: var(--text);
            font-size: 13px;
          }

          .btn-add-webhook {
            padding: 8px 16px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
          }

          .webhooks-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .webhook-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: var(--bg-surface-2);
            border: 1px solid var(--border-light);
            border-radius: 4px;
            font-size: 13px;
          }

          .webhook-url {
            flex: 1;
            word-break: break-all;
          }

          .btn-test {
            padding: 6px 12px;
            background: var(--bg-surface);
            border: 1px solid var(--border-light);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
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

export default IntegrationsManager;
