/**
 * Quick Replies Service
 *
 * Administra atajos y respuestas rápidas para la venta de productos digitales,
 * por plataforma, con almacenamiento local y atajos de teclado (Ctrl+1..9).
 *
 * El pack anterior era para armado de CV. Al cambiar CURRENT_VERSION, la carga
 * detecta la versión vieja en localStorage y reemplaza los atajos sola: nadie
 * tiene que ir a borrarlos a mano.
 */

const CURRENT_VERSION = 'productos_v1';

class QuickRepliesService {
  constructor() {
    this.quickReplies = {};
    this.loadQuickReplies();
  }

  /**
   * Cargar respuestas rápidas desde localStorage con migración automática al pack de CV
   */
  loadQuickReplies() {
    try {
      const storedVersion = localStorage.getItem('quick_replies_version');
      const stored = localStorage.getItem('quick_replies');

      if (storedVersion !== CURRENT_VERSION || !stored) {
        this.quickReplies = this._getDefaultReplies();
        this._persistQuickReplies();
        localStorage.setItem('quick_replies_version', CURRENT_VERSION);
      } else {
        const parsed = JSON.parse(stored);
        Object.keys(parsed).forEach(plat => {
          if (Array.isArray(parsed[plat])) {
            parsed[plat] = parsed[plat].map(r => ({
              id: r.id,
              title: r.title || r.label || r.shortcut || (r.text ? (r.text.length > 20 ? r.text.slice(0, 20) + '…' : r.text) : 'Atajo'),
              text: r.text || r.message || ''
            }));
          }
        });
        this.quickReplies = parsed;
      }
    } catch (err) {
      console.error('Error loading quick replies:', err);
      this.quickReplies = this._getDefaultReplies();
    }
  }

  /**
   * Respuestas y preguntas predeterminadas especializadas en creación y optimización de CV
   */
  _getDefaultReplies() {
    const ventaReplies = [
      {
        id: 1,
        title: 'Saludo',
        text: '¡Hola! 👋 Gracias por escribirnos. Contame qué estás buscando y te paso los detalles.'
      },
      {
        id: 2,
        title: 'Catálogo',
        text: 'Te muestro lo que tenemos disponible ahora mismo 👇'
      },
      {
        id: 3,
        title: 'Datos de pago',
        text: 'Para la transferencia:\n\n👤 Titular: [TITULAR]\n🪪 [DOCUMENTO]\n🏦 [BANCO]\n💳 Cuenta: [CUENTA]\n\nCuando transfieras, mandame la captura del comprobante por acá.'
      },
      {
        id: 4,
        title: 'Pedir comprobante',
        text: 'Mandame la captura del comprobante, que se vea el monto y la confirmación de la operación, y te habilito el acceso apenas lo verifiquemos.'
      },
      {
        id: 5,
        title: 'Verificando pago',
        text: 'Recibimos tu comprobante. Lo estamos verificando contra la cuenta y te confirmamos por acá en unos minutos.'
      },
      {
        id: 6,
        title: 'Entregar acceso',
        text: '✅ Pago confirmado. Acá va tu acceso:\n\n🔗 [LINK]\n\nCualquier problema para abrirlo, escribime por acá.'
      },
      {
        id: 7,
        title: 'No llegó el pago',
        text: 'Revisé la cuenta y todavía no veo la transferencia acreditada. A veces tarda un rato según el banco. Si ya la hiciste, pasame el número de operación así la busco.'
      },
      {
        id: 8,
        title: 'Cómo se entrega',
        text: 'Es un archivo digital: apenas confirmamos el pago te mando el enlace por acá y lo descargás al celular o a la computadora. No se vence y queda tuyo.'
      },
      {
        id: 9,
        title: 'Formas de pago',
        text: 'Por ahora aceptamos transferencia bancaria. Te paso los datos y con la captura del comprobante te habilito el acceso.'
      },
      {
        id: 10,
        title: 'Despedida',
        text: '¡Gracias por tu compra! Cualquier cosa que necesites, escribime por acá. 🙌'
      }
    ];

    return {
      whatsapp: ventaReplies.map(r => ({ ...r })),
      instagram: ventaReplies.map(r => ({ ...r })),
      facebook: ventaReplies.map(r => ({ ...r }))
    };
  }

  /**
   * Obtener lista de atajos por plataforma
   */
  getByPlatform(platform) {
    const plat = platform || 'whatsapp';
    if (!this.quickReplies[plat] || this.quickReplies[plat].length === 0) {
      const defaults = this._getDefaultReplies();
      this.quickReplies[plat] = JSON.parse(JSON.stringify(defaults[plat] || defaults.whatsapp));
      this._persistQuickReplies();
    }
    return this.quickReplies[plat];
  }

  /**
   * Agregar un nuevo atajo con nombre y mensaje
   */
  addQuickReply(platform, titleOrData, textMaybe) {
    const plat = platform || 'whatsapp';
    if (!this.quickReplies[plat]) {
      this.quickReplies[plat] = [];
    }

    let title = '';
    let text = '';

    if (typeof titleOrData === 'object' && titleOrData !== null) {
      title = titleOrData.title || titleOrData.label || '';
      text = titleOrData.text || titleOrData.message || '';
    } else if (textMaybe !== undefined) {
      title = String(titleOrData || '').trim();
      text = String(textMaybe || '').trim();
    } else {
      text = String(titleOrData || '').trim();
      title = text.length > 20 ? text.slice(0, 20) + '…' : text;
    }

    const id = this.quickReplies[plat].length > 0
      ? Math.max(...this.quickReplies[plat].map(r => r.id || 0)) + 1
      : 1;

    const reply = {
      id,
      title: title || 'Atajo',
      text
    };

    this.quickReplies[plat].push(reply);
    this._persistQuickReplies();
    return reply;
  }

  /**
   * Actualizar atajo existente
   */
  updateQuickReply(platform, id, titleOrData, textMaybe) {
    const plat = platform || 'whatsapp';
    if (!this.quickReplies[plat]) return null;

    const index = this.quickReplies[plat].findIndex(r => r.id === id);
    if (index === -1) return null;

    let title = this.quickReplies[plat][index].title || '';
    let text = this.quickReplies[plat][index].text || '';

    if (typeof titleOrData === 'object' && titleOrData !== null) {
      if (titleOrData.title !== undefined) title = titleOrData.title;
      if (titleOrData.text !== undefined) text = titleOrData.text;
    } else if (textMaybe !== undefined) {
      title = String(titleOrData || '').trim();
      text = String(textMaybe || '').trim();
    } else if (titleOrData !== undefined) {
      text = String(titleOrData || '').trim();
    }

    this.quickReplies[plat][index] = {
      ...this.quickReplies[plat][index],
      title: title || 'Atajo',
      text
    };

    this._persistQuickReplies();
    return this.quickReplies[plat][index];
  }

  /**
   * Eliminar un atajo
   */
  deleteQuickReply(platform, id) {
    const plat = platform || 'whatsapp';
    if (!this.quickReplies[plat]) return false;

    this.quickReplies[plat] = this.quickReplies[plat].filter(r => r.id !== id);
    this._persistQuickReplies();
    return true;
  }

  /**
   * Restaurar preguntas predeterminadas de CV
   */
  resetToDefaults(platform = null) {
    const defaults = this._getDefaultReplies();
    if (platform) {
      this.quickReplies[platform] = JSON.parse(JSON.stringify(defaults[platform] || defaults.whatsapp));
    } else {
      this.quickReplies = defaults;
    }
    this._persistQuickReplies();
    localStorage.setItem('quick_replies_version', CURRENT_VERSION);
    return this.getByPlatform(platform || 'whatsapp');
  }

  /**
   * Obtener por atajo numérico de teclado (Ctrl+1-9)
   */
  getByShortcut(platform, number) {
    const replies = this.getByPlatform(platform);
    return replies[number - 1] || null;
  }

  /**
   * Guardar en localStorage
   */
  _persistQuickReplies() {
    localStorage.setItem('quick_replies', JSON.stringify(this.quickReplies));
  }
}

export const quickRepliesService = new QuickRepliesService();
export default quickRepliesService;
