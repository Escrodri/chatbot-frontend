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
   * Persist notes to localStorage
   */
  _persistNotes() {
    localStorage.setItem('conversation_notes', JSON.stringify(this.notes));
  }
}

export const conversationNotesService = new ConversationNotesService();
export default conversationNotesService;
