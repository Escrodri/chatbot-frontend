import React, { useState } from 'react';
import { automationService } from '../../services/automation.service';

/**
 * Aviso de que la automatización no está atendiendo.
 *
 * Aparece solo cuando hay una avería real: n8n no contesta, contesta con error
 * o falta configuración. Que un asesor tenga tomado un chat no enciende nada,
 * porque eso es una decisión, no una falla.
 *
 * El mensaje del cliente siempre quedó guardado: lo que este cartel pide es que
 * alguien conteste a mano mientras tanto.
 */
export function AutomationAlert({ estado, apiFetch, onCerrar }) {
  const [probando, setProbando] = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState(null);

  if (!estado || !estado.hayProblema) return null;

  const fallo = estado.ultimoFallo || {};
  const texto = automationService.describir(fallo.motivo, fallo.detalle);
  const repetidos = estado.fallosSeguidos > 1
    ? ` Van ${estado.fallosSeguidos} mensajes sin atender.`
    : '';

  const probar = async () => {
    setProbando(true);
    setResultadoPrueba(null);
    try {
      const res = await automationService.probar(apiFetch);
      const p = res.prueba || {};
      setResultadoPrueba(
        p.alcanzable
          ? `n8n respondió en ${p.latenciaMs} ms. Si el flujo sigue sin contestar, revisá que esté activo.`
          : `Sigue sin responder: ${p.detalle || 'sin detalle'}`
      );
    } catch (err) {
      setResultadoPrueba('No se pudo hacer la prueba.');
    } finally {
      setProbando(false);
    }
  };

  const cerrar = async () => {
    await automationService.reconocer(apiFetch);
    if (onCerrar) onCerrar();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        background: '#fdecea',
        borderBottom: '1px solid #f0b4ae',
        color: '#7d2a20',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        fontSize: '14px',
        lineHeight: 1.45
      }}
    >
      <span style={{ flex: '1 1 320px', minWidth: 0 }}>
        <strong>Las respuestas automáticas no están saliendo.</strong>{' '}
        {texto}
        {repetidos} Los mensajes entraron igual: contestalos a mano hasta que se
        normalice.
        {resultadoPrueba && (
          <span style={{ display: 'block', marginTop: '4px', opacity: 0.9 }}>
            {resultadoPrueba}
          </span>
        )}
      </span>

      <button
        type="button"
        onClick={probar}
        disabled={probando}
        style={{
          background: '#ffffff',
          border: '1px solid #d8897f',
          color: '#7d2a20',
          borderRadius: '6px',
          padding: '6px 12px',
          cursor: probando ? 'default' : 'pointer',
          fontSize: '13px'
        }}
      >
        {probando ? 'Probando...' : 'Probar conexión'}
      </button>

      <button
        type="button"
        onClick={cerrar}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#7d2a20',
          textDecoration: 'underline',
          cursor: 'pointer',
          fontSize: '13px',
          padding: '6px 4px'
        }}
      >
        Entendido
      </button>
    </div>
  );
}

export default AutomationAlert;
