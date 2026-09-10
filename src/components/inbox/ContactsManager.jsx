import React, { useState } from 'react';
import { contactsService } from '../services/contacts.service';

export function ContactsManager({ onClose }) {
  const [activeTab, setActiveTab] = useState('list');
  const [contacts, setContacts] = useState(contactsService.getAllContacts());
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: [],
    notes: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddContact = () => {
    if (newContact.name && newContact.phone) {
      const contact = contactsService.addContact(newContact);
      setContacts([...contacts, contact]);
      setNewContact({
        name: '',
        phone: '',
        email: '',
        tags: [],
        notes: ''
      });
      setActiveTab('list');
    }
  };

  const handleDeleteContact = (contactId) => {
    contactsService.deleteContact(contactId);
    setContacts(contacts.filter(c => c.id !== contactId));
  };

  const handleExportContacts = () => {
    const csv = contactsService.exportToCSV(contacts);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleImportContacts = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imported = contactsService.importFromCSV(event.target.result);
        setContacts([...contacts, ...imported]);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contacts-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Contacts Manager</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Contacts List
          </button>
          <button
            className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Add Contact
          </button>
          <button
            className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            Import/Export
          </button>
        </div>

        <div className="modal-body">
          {/* List Tab */}
          {activeTab === 'list' && (
            <div className="contacts-list-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="contacts-list">
                {filteredContacts.length === 0 ? (
                  <p className="empty-state">No contacts found</p>
                ) : (
                  filteredContacts.map(contact => (
                    <div key={contact.id} className="contact-card">
                      <div className="contact-info">
                        <h4>{contact.name}</h4>
                        <p className="phone">{contact.phone}</p>
                        {contact.email && <p className="email">{contact.email}</p>}
                        {contact.tags.length > 0 && (
                          <div className="tags">
                            {contact.tags.map(tag => (
                              <span key={tag} className="tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="contact-actions">
                        <button
                          className="danger-btn"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Add Contact Tab */}
          {activeTab === 'add' && (
            <div className="add-contact-section">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  placeholder="Contact name"
                />
              </div>

              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  placeholder="Email address"
                />
              </div>

              <div className="form-group">
                <label>Tags</label>
                <input
                  type="text"
                  placeholder="Add tags (comma-separated)"
                  onBlur={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                    setNewContact({...newContact, tags});
                  }}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                  placeholder="Additional notes"
                />
              </div>

              <button onClick={handleAddContact} className="primary-btn">
                Add Contact
              </button>
            </div>
          )}

          {/* Import/Export Tab */}
          {activeTab === 'import' && (
            <div className="import-export-section">
              <div className="import-section">
                <h3>Import Contacts</h3>
                <p>Upload a CSV file with columns: name, phone, email, tags, notes</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportContacts}
                  className="file-input"
                />
              </div>

              <div className="export-section">
                <h3>Export Contacts</h3>
                <p>Download all contacts as CSV file</p>
                <button onClick={handleExportContacts} className="primary-btn">
                  Export Contacts
                </button>
              </div>

              <div className="bulk-operations">
                <h3>Bulk Operations</h3>
                <p>Total contacts: {contacts.length}</p>
                <button className="secondary-btn">Bulk Tag Contacts</button>
                <button className="secondary-btn">Bulk Delete</button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="secondary-btn">Close</button>
        </div>
      </div>
    </div>
  );
}

export default ContactsManager;
