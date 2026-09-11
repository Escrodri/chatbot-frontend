import React, { useState, useEffect } from 'react';
import cvFormService from '../services/cvFormService';

/**
 * CVFormModal Component
 * Modal para formulario progresivo de CV
 * Muestra un campo a la vez con navegación back/next
 */
export function CVFormModal({ cvType, visible, onSubmit, onCancel }) {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields = cvFormService.getFields(cvType);
  const currentField = fields[currentFieldIndex];
  const progressPercent = ((currentFieldIndex + 1) / fields.length) * 100;

  // Manejo de cambio de valor
  const handleFieldChange = (value) => {
    setFormData({
      ...formData,
      [currentField.id]: value
    });
    // Limpiar errores al cambiar el valor
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Validación del campo actual
  const validateCurrentField = () => {
    if (currentField.required && (!formData[currentField.id] || formData[currentField.id].trim() === '')) {
      setErrors([`${currentField.label} es requerido`]);
      return false;
    }

    // Validaciones específicas
    if (currentField.type === 'email' && formData[currentField.id]) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[currentField.id])) {
        setErrors(['Correo electrónico inválido']);
        return false;
      }
    }

    if (currentField.type === 'tel' && formData[currentField.id]) {
      if (!/\d{7,}/.test(formData[currentField.id].replace(/\D/g, ''))) {
        setErrors(['Teléfono debe tener al menos 7 dígitos']);
        return false;
      }
    }

    return true;
  };

  // Avanzar al siguiente campo
  const handleNext = () => {
    if (validateCurrentField()) {
      if (currentFieldIndex < fields.length - 1) {
        setCurrentFieldIndex(currentFieldIndex + 1);
      } else {
        // Último campo - enviar
        handleSubmitForm();
      }
    }
  };

  // Retroceder al campo anterior
  const handleBack = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
      setErrors([]);
    }
  };

  // Enviar formulario
  const handleSubmitForm = async () => {
    // Validación final completa
    const validation = cvFormService.validateForm(formData, cvType);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Enviar al componente padre (ChatArea)
      if (onSubmit) {
        onSubmit(formData);
      }
    } catch (error) {
      setErrors(['Error al enviar el formulario. Intenta de nuevo.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar tecla Enter para avanzar
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFieldIndex === fields.length - 1) {
        handleSubmitForm();
      } else {
        handleNext();
      }
    }
  };

  if (!visible) return null;

  const isLastField = currentFieldIndex === fields.length - 1;
  const buttonLabel = isLastField ? 'Enviar' : 'Siguiente';

  return (
    <div className="cv-form-modal-overlay">
      <div className="cv-form-modal">
        {/* Encabezado */}
        <div className="cv-form-header">
          <h3 className="cv-form-title">Formulario de CV</h3>
          <button className="cv-form-close-btn" onClick={onCancel} disabled={isSubmitting}>
            ✕
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="cv-form-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="progress-text">
            Pregunta {currentFieldIndex + 1} de {fields.length}
          </p>
        </div>

        {/* Contenido del campo */}
        <div className="cv-form-content">
          <label htmlFor="field-input" className="field-label">
            {currentField.label}
            {currentField.required && <span className="required-asterisk">*</span>}
          </label>

          {currentField.type === 'textarea' ? (
            <textarea
              id="field-input"
              className="field-input field-textarea"
              value={formData[currentField.id] || ''}
              onChange={(e) => handleFieldChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ingresa ${currentField.label.toLowerCase()}`}
              disabled={isSubmitting}
              autoFocus
              rows={4}
            />
          ) : (
            <input
              id="field-input"
              type={currentField.type}
              className="field-input"
              value={formData[currentField.id] || ''}
              onChange={(e) => handleFieldChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ingresa ${currentField.label.toLowerCase()}`}
              disabled={isSubmitting}
              autoFocus
            />
          )}

          {/* Errores */}
          {errors.length > 0 && (
            <div className="field-errors">
              {errors.map((error, idx) => (
                <p key={idx} className="error-message">{error}</p>
              ))}
            </div>
          )}
        </div>

        {/* Botones de navegación */}
        <div className="cv-form-actions">
          <button
            className="btn-secondary"
            onClick={handleBack}
            disabled={currentFieldIndex === 0 || isSubmitting}
          >
            ← Atrás
          </button>
          <button
            className="btn-primary"
            onClick={isLastField ? handleSubmitForm : handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Enviando...' : buttonLabel}
          </button>
        </div>
      </div>

      <style>{`
        .cv-form-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-end;
          z-index: 1000;
          padding: 16px;
        }

        .cv-form-modal {
          background: var(--bg-panel);
          border-radius: 16px 16px 0 0;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .cv-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
        }

        .cv-form-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-strong);
        }

        .cv-form-close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .cv-form-close-btn:hover:not(:disabled) {
          background: var(--bg-active);
          color: var(--text-strong);
        }

        .cv-form-close-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cv-form-progress {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: var(--bg-active);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: var(--wa-teal);
          transition: width 0.3s ease;
        }

        .progress-text {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted);
        }

        .cv-form-content {
          padding: 20px;
          flex: 1;
          overflow-y: auto;
        }

        .field-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-strong);
          margin-bottom: 8px;
        }

        .required-asterisk {
          color: #ef4444;
          margin-left: 2px;
        }

        .field-input {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          color: var(--text-strong);
          background: var(--bg-input);
          box-sizing: border-box;
          transition: all 0.2s;
        }

        .field-input:focus {
          outline: none;
          border-color: var(--wa-teal);
          box-shadow: 0 0 0 3px rgba(0, 168, 132, 0.1);
        }

        .field-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .field-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .field-errors {
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 6px;
          border-left: 3px solid #ef4444;
        }

        .error-message {
          margin: 4px 0;
          font-size: 12px;
          color: #dc2626;
          font-weight: 500;
        }

        .cv-form-actions {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          background: var(--bg-panel);
        }

        .btn-secondary,
        .btn-primary {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-secondary {
          background: var(--bg-active);
          color: var(--text-strong);
          border: 1px solid var(--border);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--bg-hover);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--wa-teal);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0d9488;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .cv-form-modal {
            max-width: 100%;
            border-radius: 16px 16px 0 0;
          }

          .cv-form-header {
            padding: 16px;
          }

          .cv-form-content {
            padding: 16px;
          }

          .cv-form-actions {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default CVFormModal;
