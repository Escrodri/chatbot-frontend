/**
 * Conversation Notes Service
 *
 * Manages conversation notes, tags, and custom contact names.
 */

class ConversationNotesService {
  constructor() {
    this.notes = {};
    this.loadNotes();
  }

  /**
   * Load notes from localStorage
   */
  loadNotes() {
    try {
      const stored = localStorage.getItem('conversation_notes');
      this.notes = stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.error('Error loading notes:', err);
      this.notes = {};
    }
  }

  /**
   * Get note for conversation
   */
  getNote(conversationId) {
    return this.notes[conversationId] || null;
  }

  /**
   * Get or create note
   */
  getOrCreateNote(conversationId, contactName) {
    if (!this.notes[conversationId]) {
      this.notes[conversationId] = {
        id: conversationId,
        contactName: contactName,
        customName: null,
        notes: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this._persistNotes();
    }
    return this.notes[conversationId];
  }

  /**
   * Save note
   */
  saveNote(conversationId, contactName, noteText) {
    const note = this.getOrCreateNote(conversationId, contactName);
    note.notes = noteText;
    note.updatedAt = new Date().toISOString();
    this._persistNotes();
    return note;
  }

  /**
   * Add tag to conversation
   */
  addTag(conversationId, tag) {
    const note = this.getOrCreateNote(conversationId, '');
    if (!note.tags.includes(tag)) {
      note.tags.push(tag);
      note.updatedAt = new Date().toISOString();
      this._persistNotes();
    }
    return note;
  }

  /**
   * Remove tag from conversation
   */
  removeTag(conversationId, tag) {
    const note = this.notes[conversationId];
    if (note) {
      note.tags = note.tags.filter(t => t !== tag);
      note.updatedAt = new Date().toISOString();
      this._persistNotes();
    }
    return note;
  }

  /**
   * Set custom contact name
   */
  setCustomName(conversationId, customName) {
    const note = this.getOrCreateNote(conversationId, '');
    note.customName = customName;
    note.updatedAt = new Date().toISOString();
    this._persistNotes();
    return note;
  }

  /**
   * Get all tags
   */
  getAllTags() {
    const tags = new Set();
    Object.values(this.notes).forEach(note => {
      note.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }

  /**
   * Get conversations by tag
   */
  getByTag(tag) {
    return Object.entries(this.notes)
      .filter(([_, note]) => note.tags?.includes(tag))
      .map(([convId, _]) => convId);
  }

  /**
   * Delete note
   */
  deleteNote(conversationId) {
    delete this.notes[conversationId];
    this._persistNotes();
  }

  /**
   * Predefined tag suggestions
   */
  getPredefinedTags() {
    return [
      { id: 'seguimiento', name: 'Seguimiento', color: '#3b82f6' },
      { id: 'urgente', name: 'Urgente', color: '#ef4444' },
      { id: 'vip', name: 'VIP', color: '#8b5cf6' },
      { id: 'reclamo', name: 'Reclamo', color: '#f59e0b' }
    ];
  }

  /**
   * Get conversation data bundle
   */
  getConversationData(conversationId) {
    const note = this.getNote(conversationId);
    return {
      noteText: note?.notes || '',
      tags: note?.tags || [],
      customName: note?.customName || null
    };
  }

  /**
   * Get tags for a specific conversation
   */
  getTags(conversationId) {
    const note = this.getNote(conversationId);
    return note?.tags || [];
  }

  /**
   * Check if a conversation has a specific tag
   */
  hasTag(conversationId, tag) {
    const note = this.getNote(conversationId);
    return Boolean(note?.tags?.includes(tag));
  }

  /**
   * Get display name (custom override or fallback)
   */
  getDisplayName(conversationId, defaultName = '') {
    const note = this.getNote(conversationId);
    return note?.customName || defaultName || '';
  }

  /**
   * Update or set note text for a conversation
   */
  updateNoteText(conversationId, noteText) {
    const note = this.getOrCreateNote(conversationId, '');
    note.notes = noteText;
    note.updatedAt = new Date().toISOString();
    this._persistNotes();
    return note;
  }

  /**
   * Get note text for a conversation
   */
  getNoteText(conversationId) {
    const note = this.getNote(conversationId);
    return note?.notes || '';
  }

  /**
   * Persist notes to localStorage
   */
  _persistNotes() {
    localStorage.setItem('conversation_notes', JSON.stringify(this.notes));
  }
}

export const conversationNotesService = new ConversationNotesService();
export default conversationNotesService;
