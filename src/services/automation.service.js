/**
 * Estado de la automatización con n8n.
 *
 * Todo lo que hay acá contesta una sola pregunta: cuando entra un mensaje y
 * nadie responde, ¿es porque el bot está en pausa a propósito o porque n8n no
 * está contestando? Antes las dos cosas se veían igual desde la bandeja.
 */

const MENSAJES = {
  apagada: 'La automatización está apagada.',
  sin_url: 'Falta configurar la dirección del flujo de n8n.',
  http: 'n8n respondió con un error.',
  timeout: 'n8n no respondió a tiempo.',
  red: 'No se pudo conectar con n8n.'
};

export const automationService = {
  /**
   * Estado guardado, sin tocar la red. Barato: lo llama el sondeo.
   */
  async obtenerEstado(apiFetch) {
    const res = await apiFetch('/api/automation/health');
    if (!res.ok) throw new Error('No se pudo consultar el estado de la automatización');
    return res.json();
  },

  /**
   * Prueba real contra n8n. La dispara una persona, no el sondeo.
   */
  async probar(apiFetch) {
    const res = await apiFetch('/api/automation/health?ping=1');
    if (!res.ok) throw new Error('No se pudo probar la conexión con n8n');
    return res.json();
  },

  /**
   * Apaga el aviso una vez leído.
   */
  async reconocer(apiFetch) {
    const res = await apiFetch('/api/automation/ack', { method: 'POST' });
    return res.ok;
  },

  /**
   * Texto para mostrar, a partir del motivo que devolvió el backend.
   */
  describir(motivo, detalle) {
    const base = MENSAJES[motivo] || 'La automatización tuvo un problema.';
    return detalle ? `${base} (${detalle})` : base;
  }
};

export default automationService;
