import React, { useState, useMemo } from 'react';

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
            <span className="unread-total-badge">{totalUnread} no leídos</span>
          )}
        </div>

        {/* Buscador predictivo */}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre o mensaje..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filtros de Plataforma */}
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
            Facebook
          </button>
        </div>
      </div>

      {/* Lista de Chats con Scroll */}
      <div className="chats-scroll-list">
        {filteredConversations.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '0.85rem' }}>
            No se encontraron conversaciones con los filtros actuales.
          </div>
        ) : (
          filteredConversations.map(chat => {
            const isSelected = chat.id === selectedId;
            const platformIcon = chat.platform === 'whatsapp' ? '📱' : chat.platform === 'instagram' ? '📷' : '💬';
            const isBotActive = chat.bot_status === 'active';

            return (
              <div
                key={chat.id}
                className={`chat-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="chat-avatar">
                  <span>{(chat.contact_name || 'C').charAt(0).toUpperCase()}</span>
                  <span
                    className="chat-platform-dot"
                    style={{ background: chat.channel_color || '#D4AF37' }}
                    title={chat.platform}
                  >
                    {platformIcon}
                  </span>
                </div>

                <div className="chat-info">
                  <div className="chat-info-top">
                    <span className="chat-contact-name">{chat.contact_name || 'Consultante'}</span>
                    <span className="chat-time">{formatChatTime(chat.last_message_time)}</span>
                  </div>

                  <div className="chat-info-bottom">
                    <span className="chat-snippet">
                      {chat.last_message_text || 'Sin mensajes previos'}
                    </span>

                    <div className="chat-badges-row">
                      <span className={`bot-chip ${isBotActive ? 'bot' : 'human'}`}>
                        {isBotActive ? '🤖 Bot' : '👤 Humano'}
                      </span>
                      {chat.unread_count > 0 && (
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
