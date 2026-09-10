/**
 * Quick Replies Service
 *
 * Administra atajos y respuestas rápidas para creación y optimización de CV
 * por plataforma con soporte de almacenamiento local y atajos de teclado.
 */

const CURRENT_VERSION = 'cv_v2';

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
    const cvReplies = [
      {
        id: 1,
        title: 'Saludo inicial',
        text: '¡Hola! 👋 Gracias por comunicarte. Te vamos a ayudar a armar o renovar tu Curriculum Vitae (CV) profesional para que te destaques en tus postulaciones laborales.'
      },
      {
        id: 2,
        title: '¿Tiene CV previo?',
        text: 'Para empezar, contanos: ¿Ya tenés un CV armado que quieras actualizar o modernizar (podés adjuntarlo en PDF o foto), o comenzamos a armarlo desde cero?'
      },
      {
        id: 3,
        title: 'Datos de contacto',
        text: 'Por favor, envianos tus datos personales básicos: Nombre completo, ciudad/localidad de residencia, teléfono de contacto, correo electrónico y si tenés perfil de LinkedIn.'
      },
      {
        id: 4,
        title: 'Puesto u objetivo',
        text: '¿A qué puesto, rubro o área laboral apuntás principalmente? Esto nos permite enfocar tu perfil profesional y resaltar las palabras clave adecuadas.'
      },
      {
        id: 5,
        title: 'Experiencia laboral',
        text: 'Comentanos tu experiencia de trabajo (desde la más reciente): Nombre de la empresa, puesto que ocupabas, período aproximado y las tareas principales o logros que tuviste.'
      },
      {
        id: 6,
        title: 'Educación y cursos',
        text: '¿Cuál es tu formación académica? (Secundario, terciario, universitario) y si realizaste cursos, talleres, capacitaciones o certificaciones recientes.'
      },
      {
        id: 7,
        title: 'Habilidades e idiomas',
        text: 'Mencioná tus habilidades y herramientas principales (por ejemplo: programas informáticos, atención al cliente, manejo de caja, etc.) y si tenés conocimientos de idiomas.'
      },
      {
        id: 8,
        title: 'Foto profesional',
        text: '¿Deseás incluir foto en tu CV? Si es así, envianos una foto nítida de frente, con buena iluminación y preferentemente fondo liso.'
      },
      {
        id: 9,
        title: 'Borrador y entrega',
        text: '¡Perfecto! Con toda la información preparamos el borrador de tu CV. Te lo enviaremos en PDF de alta calidad listo para imprimir o enviar para tu revisión y cambios necesarios.'
      }
    ];

    return {
      whatsapp: JSON.parse(JSON.stringify(cvReplies)),
      instagram: JSON.parse(JSON.stringify(cvReplies)),
      facebook: JSON.parse(JSON.stringify(cvReplies)),
      messenger: JSON.parse(JSON.stringify(cvReplies))
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
