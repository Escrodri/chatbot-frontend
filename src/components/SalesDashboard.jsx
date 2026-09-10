import React, { useState, useEffect } from 'react';
import { salesService } from '../services/sales.service';

export function SalesDashboard({ isOpen, onClose }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
    }
  }, [isOpen]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await salesService.getMetrics(30);
      setMetrics(data);
    } catch (err) {
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog sales-modal">
        <div className="modal-header">
          <h2>📊 Dashboard de Ventas</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content sales-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Cargando métricas...</p>
            </div>
          ) : metrics ? (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Total de Ventas</div>
                  <div className="metric-value">{salesService.formatCurrency(metrics.totalSales)}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Transacciones</div>
                  <div className="metric-value">{metrics.totalTransactions}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Ticket Promedio</div>
                  <div className="metric-value">{salesService.formatCurrency(metrics.averageOrderValue)}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Tasa de Conversión</div>
                  <div className="metric-value">{metrics.conversionRate}%</div>
                </div>
              </div>

              <div className="sales-section">
                <h3>Por Plataforma</h3>
                <div className="platform-breakdown">
                  {Object.entries(metrics.byPlatform || {}).map(([platform, data]) => (
                    <div key={platform} className="platform-stat">
                      <span>{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                      <span>{salesService.formatCurrency(data.sales)}</span>
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>{data.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>No hay datos disponibles</p>
            </div>
          )}
        </div>

        <style>{`
          .sales-modal {
            max-width: 700px;
          }

          .sales-content {
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding: 20px;
          }

          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
          }

          .metric-card {
            background: var(--bg-surface-2);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid var(--border-light);
          }

          .metric-label {
            font-size: 12px;
            color: var(--text-soft);
            margin-bottom: 8px;
            text-transform: uppercase;
          }

          .metric-value {
            font-size: 20px;
            font-weight: 600;
            color: var(--accent);
          }

          .sales-section h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
          }

          .platform-breakdown {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .platform-stat {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: var(--bg-surface-2);
            border-radius: 4px;
            font-size: 13px;
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
