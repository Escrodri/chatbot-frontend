/**
 * Contacts Service
 *
 * Manages contact database with import/export and bulk operations.
 */

class ContactsService {
  constructor() {
    this.contacts = [];
    this.loadContacts();
  }

  /**
   * Load contacts from localStorage
   */
  loadContacts() {
    try {
      const stored = localStorage.getItem('contacts');
      this.contacts = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error loading contacts:', err);
      this.contacts = [];
    }
  }

  /**
   * Add new contact
   */
  addContact(contactData) {
    const contact = {
      id: `contact_${Date.now()}`,
      ...contactData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.contacts.push(contact);
    this._persistContacts();
    return contact;
  }

  /**
   * Get all contacts
   */
  getAllContacts() {
    return this.contacts;
  }

  /**
   * Get contact by ID
   */
  getContactById(contactId) {
    return this.contacts.find(c => c.id === contactId);
  }

  /**
   * Update contact
   */
  updateContact(contactId, updates) {
    const index = this.contacts.findIndex(c => c.id === contactId);
    if (index !== -1) {
      this.contacts[index] = {
        ...this.contacts[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this._persistContacts();
      return this.contacts[index];
    }
    return null;
  }

  /**
   * Delete contact
   */
  deleteContact(contactId) {
    this.contacts = this.contacts.filter(c => c.id !== contactId);
    this._persistContacts();
  }

  /**
   * Search contacts
   */
  searchContacts(query) {
    const q = query.toLowerCase();
    return this.contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  /**
   * Add tag to contact
   */
  addTagToContact(contactId, tag) {
    const contact = this.getContactById(contactId);
    if (contact) {
      if (!contact.tags) contact.tags = [];
      if (!contact.tags.includes(tag)) {
        contact.tags.push(tag);
        this._persistContacts();
      }
    }
  }

  /**
   * Remove tag from contact
   */
  removeTagFromContact(contactId, tag) {
    const contact = this.getContactById(contactId);
    if (contact && contact.tags) {
      contact.tags = contact.tags.filter(t => t !== tag);
      this._persistContacts();
    }
  }

  /**
   * Export contacts to CSV
   */
  exportToCSV(contacts = this.contacts) {
    const headers = ['Name', 'Phone', 'Email', 'Tags', 'Notes'];
    const rows = contacts.map(c => [
      c.name,
      c.phone,
      c.email || '',
      (c.tags || []).join(';'),
      c.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Import contacts from CSV
   */
  importFromCSV(csvContent) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const imported = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
      const contact = {};

      headers.forEach((header, idx) => {
        if (header === 'tags') {
          contact.tags = values[idx].split(';').filter(t => t);
        } else if (header === 'name' || header === 'phone' || header === 'email' || header === 'notes') {
          contact[header] = values[idx];
        }
      });

      if (contact.name && contact.phone) {
        const added = this.addContact(contact);
        imported.push(added);
      }
    }

    return imported;
  }

  /**
   * Bulk tag contacts
   */
  bulkTagContacts(contactIds, tag) {
    contactIds.forEach(id => {
      this.addTagToContact(id, tag);
    });
  }

  /**
   * Bulk delete contacts
   */
  bulkDeleteContacts(contactIds) {
    this.contacts = this.contacts.filter(c => !contactIds.includes(c.id));
    this._persistContacts();
  }

  /**
   * Get contacts by tag
   */
  getContactsByTag(tag) {
    return this.contacts.filter(c =>
      c.tags && c.tags.includes(tag)
    );
  }

  /**
   * Get all tags
   */
  getAllTags() {
    const tags = new Set();
    this.contacts.forEach(c => {
      if (c.tags) {
        c.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags);
  }

  /**
   * Persist contacts to localStorage
   */
  _persistContacts() {
    localStorage.setItem('contacts', JSON.stringify(this.contacts));
  }
}

export const contactsService = new ContactsService();
export default contactsService;
