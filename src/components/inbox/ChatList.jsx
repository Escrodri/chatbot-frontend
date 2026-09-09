import React, { useMemo } from 'react';
import { IconoDeCanal } from '../Icons';

// El logo del canal, en su versión oficial. Antes eran dibujos aproximados y
// se notaba: el de Messenger sobre todo.
const PlatformGlyph = ({ platform }) => (
  <IconoDeCanal platform={platform} size={10} color={false} />
);

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
                  {chat.contact_avatar ? (
                    <img
                      src={chat.contact_avatar}
                      alt={chat.contact_name || 'Contacto'}
                      className="chat-avatar-img"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span>{(chat.contact_name || 'C').charAt(0).toUpperCase()}</span>
                  )}
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
                      {isBotActive && (
                        <span className="bot-chip bot">Bot</span>
                      )}
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
