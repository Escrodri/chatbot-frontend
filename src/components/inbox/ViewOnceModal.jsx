import React, { useEffect } from 'react';

/**
 * ViewOnceModal - Visor protegido de fotos de una sola vista al estilo WhatsApp.
 *
 * Características de seguridad y UX:
 * - Fondo oscuro inmersivo (estilo visor oficial de WhatsApp).
 * - Protección contra clic derecho (onContextMenu) y arrastre (drag & drop).
 * - Marca de agua sutil de protección con nombre del chat y fecha.
 * - Cierre con botón o tecla Escape que activa el marcado de "Abierto / Visto".
 */
export function ViewOnceModal({
  imageUrl,
  caption,
  senderName = 'Contacto',
  timestamp,
  onClose
}) {
  // Manejar tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const dateFormatted = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      className="view-once-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Foto de una sola vista"
    >
      <div
        className="view-once-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del visor */}
        <div className="view-once-modal-header">
          <div className="view-once-modal-title">
            <span className="view-once-badge-icon">①</span>
            <div className="view-once-title-text">
              <span className="view-once-title-main">Foto de una sola vista</span>
              <span className="view-once-title-sub">
                {senderName} {dateFormatted ? `• ${dateFormatted}` : ''}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="view-once-close-btn"
            onClick={onClose}
            title="Cerrar y marcar como vista (Escape)"
          >
            &times;
          </button>
        </div>

        {/* Contenedor de la imagen con protección anti-guardado */}
        <div
          className="view-once-image-wrapper"
          onContextMenu={(e) => e.preventDefault()}
        >
          <img
            src={imageUrl}
            alt="Foto de una sola vista"
            className="view-once-protected-img"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Marca de agua de protección */}
          <div className="view-once-watermark-overlay" aria-hidden="true">
            <span>{senderName} • Vista única protegida</span>
          </div>
        </div>

        {/* Pie del visor: Caption y advertencia */}
        <div className="view-once-modal-footer">
          {caption && caption !== '① Foto' && caption !== '📷 [Imagen]' && (
            <p className="view-once-caption-text">{caption}</p>
          )}
          <div className="view-once-footer-info">
            <span className="view-once-notice">
              <span className="view-once-badge-pill">①</span>
              Esta foto se autodestruye al salir. No se podrá volver a abrir.
            </span>
            <button
              type="button"
              className="view-once-btn-ok"
              onClick={onClose}
            >
              Listo
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .view-once-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 15, 20, 0.94);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
          animation: voFadeIn 0.2s ease-out;
        }

        .view-once-modal-content {
          display: flex;
          flex-direction: column;
          max-width: 90vw;
          max-height: 94vh;
          width: 720px;
          background: #111b21;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          animation: voScaleIn 0.25s ease-out;
        }

        .view-once-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #1f2c34;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: #e9edef;
        }

        .view-once-modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .view-once-badge-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #25D366;
          color: #0b141a;
          font-weight: 800;
          font-size: 16px;
        }

        .view-once-title-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .view-once-title-main {
          font-weight: 600;
          font-size: 0.95rem;
          color: #e9edef;
        }

        .view-once-title-sub {
          font-size: 0.78rem;
          color: #8696a0;
        }

        .view-once-close-btn {
          background: none;
          border: none;
          color: #aebac1;
          font-size: 28px;
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }

        .view-once-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .view-once-image-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0b141a;
          min-height: 280px;
          max-height: 68vh;
          overflow: hidden;
          user-select: none;
        }

        .view-once-protected-img {
          max-width: 100%;
          max-height: 68vh;
          object-fit: contain;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
          pointer-events: none;
        }

        .view-once-watermark-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          opacity: 0.14;
          transform: rotate(-24deg);
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .view-once-modal-footer {
          padding: 14px 20px;
          background: #1f2c34;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .view-once-caption-text {
          margin: 0;
          font-size: 0.9rem;
          color: #e9edef;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .view-once-footer-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .view-once-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #8696a0;
        }

        .view-once-badge-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid #8696a0;
          font-size: 11px;
          font-weight: 700;
          color: #8696a0;
        }

        .view-once-btn-ok {
          background: #00a884;
          color: #111b21;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.88rem;
          padding: 8px 20px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }

        .view-once-btn-ok:hover {
          background: #25D366;
          transform: translateY(-1px);
        }

        @keyframes voFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes voScaleIn {
          from { transform: scale(0.94); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ViewOnceModal;
