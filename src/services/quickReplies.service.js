/**
 * Quick Replies Service
 *
 * Manages quick reply templates per channel with keyboard shortcuts.
 */

class QuickRepliesService {
  constructor() {
    this.quickReplies = {};
    this.loadQuickReplies();
  }

  /**
   * Load quick replies from localStorage
   */
  loadQuickReplies() {
    try {
      const stored = localStorage.getItem('quick_replies');
      this.quickReplies = stored ? JSON.parse(stored) : this._getDefaultReplies();
    } catch (err) {
      console.error('Error loading quick replies:', err);
      this.quickReplies = this._getDefaultReplies();
    }
  }

  /**
   * Get default quick replies
   */
  _getDefaultReplies() {
    return {
      whatsapp: [
        { id: 1, text: 'Hola 👋 ¿En qué puedo ayudarte?' },
        { id: 2, text: 'Un momento, dejame verificar esa información...' },
        { id: 3, text: 'Perfecto, entendí. Te paso los detalles.' }
      ],
      instagram: [
        { id: 1, text: '¡Hola! Gracias por escribir 😊' },
        { id: 2, text: 'Déjame chequear eso rápido...' },
        { id: 3, text: 'Listos los detalles para vos!' }
      ],
      facebook: [
        { id: 1, text: 'Hola, ¿qué necesitás?' },
        { id: 2, text: 'Un segundo...' },
        { id: 3, text: 'Acá están los datos' }
      ]
    };
  }

  /**
   * Get quick replies for platform
   */
  getByPlatform(platform) {
    return this.quickReplies[platform] || [];
  }

  /**
   * Add quick reply
   */
  addQuickReply(platform, text) {
    if (!this.quickReplies[platform]) {
      this.quickReplies[platform] = [];
    }

    const id = this.quickReplies[platform].length > 0
      ? Math.max(...this.quickReplies[platform].map(r => r.id)) + 1
      : 1;

    const reply = { id, text };
    this.quickReplies[platform].push(reply);
    this._persistQuickReplies();
    return reply;
  }

  /**
   * Update quick reply
   */
  updateQuickReply(platform, id, text) {
    if (!this.quickReplies[platform]) return null;

    const index = this.quickReplies[platform].findIndex(r => r.id === id);
    if (index !== -1) {
      this.quickReplies[platform][index].text = text;
      this._persistQuickReplies();
      return this.quickReplies[platform][index];
    }
    return null;
  }

  /**
   * Delete quick reply
   */
  deleteQuickReply(platform, id) {
    if (!this.quickReplies[platform]) return false;

    this.quickReplies[platform] = this.quickReplies[platform].filter(r => r.id !== id);
    this._persistQuickReplies();
    return true;
  }

  /**
   * Get quick reply by keyboard shortcut (Ctrl+1-9)
   */
  getByShortcut(platform, number) {
    const replies = this.getByPlatform(platform);
    return replies[number - 1] || null;
  }

  /**
   * Persist quick replies to localStorage
   */
  _persistQuickReplies() {
    localStorage.setItem('quick_replies', JSON.stringify(this.quickReplies));
  }
}

export const quickRepliesService = new QuickRepliesService();
export default quickRepliesService;
