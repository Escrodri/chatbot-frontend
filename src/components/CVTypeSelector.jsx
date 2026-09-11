import React from 'react';

/**
 * CVTypeSelector Component
 * Muestra botones para seleccionar tipo de CV (Clásico o Harvard)
 * Se renderiza como un mensaje en el chat
 */
export function CVTypeSelector({ onSelectType }) {
  return (
    <div className="cv-type-selector">
      <p className="selector-label">¿Qué tipo de CV necesitas?</p>

      <div className="selector-buttons">
        {/* CV Clásico */}
        <button
          className="cv-type-btn cv-type-btn-classic"
          onClick={() => onSelectType('classic')}
          title="CV Clásico - Gs. 35.000"
        >
          <span className="btn-type">CV Clásico</span>
          <span className="btn-price">Gs. 35.000</span>
          <span className="btn-desc">Para supermercados, tiendas, seguridad, transporte</span>
        </button>

        {/* CV Harvard */}
        <button
          className="cv-type-btn cv-type-btn-harvard"
          onClick={() => onSelectType('harvard')}
          title="CV Harvard a prueba de ATS - Gs. 50.000"
        >
          <span className="btn-type">CV Harvard a prueba de ATS</span>
          <span className="btn-price">Gs. 50.000</span>
          <span className="btn-desc">Para empresas que usan sistemas de selección</span>
        </button>
      </div>

      <style>{`
        .cv-type-selector {
          margin: 12px 0;
          padding: 0;
        }

        .selector-label {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-strong);
        }

        .selector-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cv-type-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 12px 16px;
          border: 2px solid var(--border);
          border-radius: 8px;
          background: var(--bg-panel);
          color: var(--text-strong);
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          text-align: left;
        }

        .cv-type-btn:hover {
          border-color: var(--wa-teal);
          background: var(--bg-active);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 168, 132, 0.15);
        }

        .cv-type-btn:active {
          transform: translateY(0);
        }

        .cv-type-btn-classic {
          border-color: #10b981;
        }

        .cv-type-btn-classic:hover {
          border-color: #059669;
          background: rgba(16, 185, 129, 0.05);
        }

        .cv-type-btn-harvard {
          border-color: #f59e0b;
        }

        .cv-type-btn-harvard:hover {
          border-color: #d97706;
          background: rgba(245, 158, 11, 0.05);
        }

        .btn-type {
          display: block;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-strong);
          margin-bottom: 4px;
        }

        .btn-price {
          display: block;
          font-size: 18px;
          font-weight: 800;
          color: var(--wa-teal);
          margin-bottom: 6px;
        }

        .btn-desc {
          display: block;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        @media (max-width: 480px) {
          .cv-type-btn {
            padding: 10px 12px;
          }

          .btn-type {
            font-size: 14px;
          }

          .btn-price {
            font-size: 16px;
          }

          .btn-desc {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}

export default CVTypeSelector;
