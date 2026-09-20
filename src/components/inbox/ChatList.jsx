import React, { useMemo } from 'react';
import { IconoDeCanal } from '../Icons';
import { conversationNotesService } from '../../services/conversationNotes.service';
import { OrderBadge } from './OrderBadge';
const PLATFORM_COLORS = {
  whatsapp: '#25d366',
  instagram: '#e1306c',
  facebook: '#1877f2',
  messenger: '#1877f2'
};

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
  // Filtro por estado de venta. 'verificar' es el que importa en el dia a dia:
  // son los que mandaron comprobante y estan esperando que alguien lo mire.
  const [filtroVenta, setFiltroVenta] = React.useState('all');
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      // Filtro de plataforma
      if (selectedPlatform && selectedPlatform !== 'all') {
        if (c.platform !== selectedPlatform) return false;
      }
      // Filtro por estado de venta
      if (filtroVenta === 'verificar' && c.order_status !== 'comprobante_recibido') return false;
      if (filtroVenta === 'pagaron' && c.order_status !== 'pagado' && c.order_status !== 'entregado') return false;
      if (filtroVenta === 'no_pagaron' && c.order_status !== 'interesado') return false;

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
  }, [conversations, selectedPlatform, searchQuery, filtroVenta]);

  const porVerificar = useMemo(() => {
    return conversations.filter(c => c.order_status === 'comprobante_recibido').length;
  }, [conversations]);

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

        {/* Estado de venta: reemplaza la consulta a la planilla */}
        <div className="filter-pills" style={{ marginTop: '6px' }}>
          <button
            className={`filter-pill ${filtroVenta === 'all' ? 'active' : ''}`}
            onClick={() => setFiltroVenta('all')}
          >
            Todas
          </button>
          <button
            className={`filter-pill ${filtroVenta === 'verificar' ? 'active' : ''}`}
            onClick={() => setFiltroVenta('verificar')}
            title="Mandaron comprobante y falta verificar el pago"
          >
            Verificar{porVerificar > 0 ? ` (${porVerificar})` : ''}
          </button>
          <button
            className={`filter-pill ${filtroVenta === 'pagaron' ? 'active' : ''}`}
            onClick={() => setFiltroVenta('pagaron')}
          >
            Pagaron
          </button>
          <button
            className={`filter-pill ${filtroVenta === 'no_pagaron' ? 'active' : ''}`}
            onClick={() => setFiltroVenta('no_pagaron')}
          >
            Sin pagar
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

            const note = conversationNotesService.getNote(chat.id);
            const displayName = note?.customName || chat.contact_name || 'Contacto';

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
                      alt={displayName}
                      className="chat-avatar-img"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span>{displayName.charAt(0).toUpperCase()}</span>
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
                    <span className="chat-contact-name">{displayName}</span>
                    <span className="chat-time">{formatChatTime(chat.last_message_time)}</span>
                  </div>

                  {Array.isArray(chat.tags) && chat.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                      {chat.tags.map(t => (
                        <span key={t.id} title={t.name} style={{
                          fontSize: '9.5px', fontWeight: 700, lineHeight: 1,
                          padding: '3px 6px', borderRadius: '4px',
                          color: '#fff', background: t.color || '#6b7280',
                          maxWidth: '110px', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="chat-info-bottom">
                    <span className="chat-snippet">
                      {chat.last_message_text || 'Sin mensajes previos'}
                    </span>

                    <div className="chat-badges-row">
                      {chat.order_status && (
                        <OrderBadge status={chat.order_status} compacto />
                      )}
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
