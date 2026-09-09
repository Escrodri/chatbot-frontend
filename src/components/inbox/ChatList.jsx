import React, { useMemo } from 'react';

const PLATFORM_COLORS = {
  whatsapp: '#25d366',
  instagram: '#e1306c',
  facebook: '#1877f2',
  messenger: '#1877f2'
};

function PlatformGlyph({ platform }) {
  if (platform === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">
        <path d="M12 2a9.9 9.9 0 0 0-8.6 14.9L2 22l5.3-1.4A9.9 9.9 0 1 0 12 2zm5.5 12.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2.1c-.2-.3 0-.4.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5H8c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.4 5.3 4.7 2.6 1 3.1.8 3.7.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4z" />
      </svg>
    );
  }
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5.2" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.3 2 2 6.2 2 11.8c0 3 1.3 5.6 3.5 7.4v3.3l3.2-1.8c.9.2 1.8.4 2.8.4 5.7 0 10-4.2 10-9.8S17.7 2 12 2zm1 12.8-2.6-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.3 5.7z" />
    </svg>
  );
}

export function ChatList({
  conversations,
  selectedId,
  onSelectChat,
  selectedPlatform,
  onSelectPlatform,
  searchQuery,
  onSearchChange
}) {
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      // Filtro de plataforma
      if (selectedPlatform && selectedPlatform !== 'all') {
        if (c.platform !== selectedPlatform) return false;
      }
      // Filtro de búsqueda
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (c.contact_name || '').toLowerCase().includes(q);
        const textMatch = (c.last_message_text || '').toLowerCase().includes(q);
        const phoneMatch = (c.contact_phone || '').toLowerCase().includes(q);
        if (!nameMatch && !textMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [conversations, selectedPlatform, searchQuery]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [conversations]);

  const formatChatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    return isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  return (
    <aside className="inbox-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h3>Conversaciones</h3>
          {totalUnread > 0 && (
            <span className="unread-total-badge">{totalUnread}</span>
          )}
        </div>

        {/* Buscador */}
        <div className="search-box">
          <span className="search-icon">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.4-3.4" />
            </svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar un chat o mensaje"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filtros de plataforma */}
        <div className="filter-pills">
          <button
            className={`filter-pill ${selectedPlatform === 'all' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('all')}
          >
            Todos ({conversations.length})
          </button>
          <button
            className={`filter-pill ${selectedPlatform === 'whatsapp' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('whatsapp')}
          >
            WhatsApp
          </button>
          <button
            className={`filter-pill ${selectedPlatform === 'instagram' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('instagram')}
          >
            Instagram
          </button>
          <button
            className={`filter-pill ${selectedPlatform === 'facebook' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('facebook')}
          >
            Messenger
          </button>
        </div>
      </div>

      {/* Lista de chats */}
      <div className="chats-scroll-list">
        {filteredConversations.length === 0 ? (
          <div className="chats-empty-note">
            No hay conversaciones con los filtros actuales.
          </div>
        ) : (
          filteredConversations.map(chat => {
            const isSelected = chat.id === selectedId;
            const isBotActive = chat.bot_status === 'active';
            const hasUnread = chat.unread_count > 0;
            const dotColor = PLATFORM_COLORS[chat.platform] || chat.channel_color || '#00a884';

            return (
              <div
                key={chat.id}
                className={`chat-item ${isSelected ? 'selected' : ''} ${hasUnread ? 'has-unread' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="chat-avatar">
                  <span>{(chat.contact_name || 'C').charAt(0).toUpperCase()}</span>
                  <span
                    className="chat-platform-dot"
                    style={{ background: dotColor }}
                    title={chat.platform}
                  >
                    <PlatformGlyph platform={chat.platform} />
                  </span>
                </div>

                <div className="chat-info">
                  <div className="chat-info-top">
                    <span className="chat-contact-name">{chat.contact_name || 'Contacto'}</span>
                    <span className="chat-time">{formatChatTime(chat.last_message_time)}</span>
                  </div>

                  <div className="chat-info-bottom">
                    <span className="chat-snippet">
                      {chat.last_message_text || 'Sin mensajes previos'}
                    </span>

                    <div className="chat-badges-row">
                      <span className={`bot-chip ${isBotActive ? 'bot' : 'human'}`}>
                        {isBotActive ? 'Bot' : 'Humano'}
                      </span>
                      {hasUnread && (
                        <span className="unread-badge">{chat.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default ChatList;
