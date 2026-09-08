import React, { useState, useEffect, useRef } from 'react';

export function ChatArea({
  conversation,
  messages,
  onSendMessage,
  onToggleBot,
  sending
}) {
  const [inputText, setInputText] = useState('');
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const chatContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevConvIdRef = useRef(null);
  const prevMessagesCountRef = useRef(0);
  const prevLastMsgIdRef = useRef(null);

  // Monitorear posición manual del scroll
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 120;
    isNearBottomRef.current = nearBottom;
    if (nearBottom && showScrollBottomBtn) {
      setShowScrollBottomBtn(false);
    }
  };

  // Scroll al final del chat
  const scrollToBottom = (behavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
    }
    isNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
  };

  // Efecto inteligente de scroll: No mueve la vista si el usuario está leyendo arriba
  useEffect(() => {
    if (!conversation) return;

    // 1. Si cambió de chat, posicionar al final inmediatamente
    if (conversation.id !== prevConvIdRef.current) {
      prevConvIdRef.current = conversation.id;
      prevMessagesCountRef.current = messages.length;
      prevLastMsgIdRef.current = messages[messages.length - 1]?.id || null;
      isNearBottomRef.current = true;
      setShowScrollBottomBtn(false);
      setTimeout(() => scrollToBottom('auto'), 40);
      return;
    }

    // 2. Si es el mismo chat, detectar si realmente entraron mensajes nuevos
    const currentLastMsgId = messages[messages.length - 1]?.id || null;
    const hasNewMessage = currentLastMsgId && currentLastMsgId !== prevLastMsgIdRef.current;
    const countIncreased = messages.length > prevMessagesCountRef.current;

    prevMessagesCountRef.current = messages.length;
    prevLastMsgIdRef.current = currentLastMsgId;

    if (hasNewMessage || countIncreased) {
      if (isNearBottomRef.current) {
        scrollToBottom('smooth');
      } else {
        // El usuario está arriba leyendo: NO saltar, solo mostrar aviso
        setShowScrollBottomBtn(true);
      }
    }
    // Si fue un simple refresco de polling sin mensajes nuevos, no tocar el scroll
  }, [messages, conversation]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setTimeout(() => scrollToBottom('smooth'), 80);
  };

  if (!conversation) return null;

  const isBotActive = conversation.bot_status === 'active';
  const platformIcon = conversation.platform === 'whatsapp' ? '📱' : conversation.platform === 'instagram' ? '📷' : '💬';
  const windowStatus = conversation.window_status || { canSendFreeText: true };

  return (
    <section className="inbox-chat-area">
      {/* Cabecera del Chat */}
      <header className="chat-header">
        <div className="chat-header-user">
          <div className="chat-header-avatar">
            {(conversation.contact_name || 'C').charAt(0).toUpperCase()}
          </div>
          <div className="chat-header-title">
            <h4>{conversation.contact_name || 'Consultante'}</h4>
            <span>
              {platformIcon} {conversation.channel_name || conversation.platform} • {conversation.contact_phone || conversation.channel_identifier}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          {/* Indicador de Ventana de Mensajería */}
          <div className={`window-indicator ${windowStatus.canSendFreeText ? 'active' : 'warning'}`}>
            <span>{windowStatus.canSendFreeText ? '🟢' : '🟡'}</span>
            <span>{windowStatus.canSendFreeText ? 'Ventana 24h Activa' : 'Human Agent (7 días)'}</span>
          </div>

          {/* Switch Handover */}
          <button
            type="button"
            className={`btn-handover ${isBotActive ? 'bot-active' : 'human-active'}`}
            onClick={() => onToggleBot(conversation.id, isBotActive ? 'handed_over' : 'active')}
            title="Alternar respuesta del bot automático vs atención humana"
          >
            <span>{isBotActive ? '🤖' : '👤'}</span>
            <span>{isBotActive ? 'Bot Activo' : 'Control Humano'}</span>
          </button>
        </div>
      </header>

      {/* Hilo de Mensajes con Scroll Controlado */}
      <div className="chat-messages-thread" ref={chatContainerRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
            No hay mensajes registrados en esta conversación.
          </div>
        ) : (
          messages.map(msg => {
            const isInbound = msg.direction === 'inbound';
            const isBot = msg.sender_type === 'bot';
            const isAgent = msg.sender_type === 'agent';

            let bubbleClass = 'inbound';
            if (!isInbound) {
              bubbleClass = isBot ? 'bot' : 'agent';
            }

            const timeStr = msg.timestamp
              ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div
                key={msg.id}
                className={`msg-bubble-wrapper ${isInbound ? 'inbound' : 'outbound'}`}
              >
                <div className={`msg-bubble ${bubbleClass}`}>
                  {/* Etiqueta de remitente si es saliente */}
                  {!isInbound && (
                    <span className={`msg-sender-tag ${isBot ? 'bot' : 'agent'}`}>
                      {isBot ? '🤖 Bot de Bienvenida' : `👤 ${msg.sender_user_name || 'Tarotista'}`}
                    </span>
                  )}

                  {/* Renderizado multimedia dinámico */}
                  {msg.content_type === 'sticker' && (
                    <div className="msg-sticker-container">
                      {msg.media_url ? (
                        <img src={msg.media_url} alt="Sticker" className="msg-sticker-img" loading="lazy" />
                      ) : (
                        <span className="msg-fallback-tag">🏷️ [Sticker]</span>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'image' && (
                    <div className="msg-media-container">
                      {msg.media_url ? (
                        <img
                          src={msg.media_url}
                          alt="Imagen enviada"
                          className="msg-media-img"
                          loading="lazy"
                          onClick={() => window.open(msg.media_url, '_blank')}
                        />
                      ) : (
                        <span className="msg-fallback-tag">📷 [Imagen]</span>
                      )}
                      {msg.text && msg.text !== '📷 [Imagen]' && (
                        <p className="msg-media-caption">{msg.text}</p>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'audio' && (
                    <div className="msg-audio-container">
                      {msg.media_url ? (
                        <audio src={msg.media_url} controls className="msg-audio-player" preload="metadata" />
                      ) : (
                        <span className="msg-fallback-tag">🎵 [Nota de voz / Audio]</span>
                      )}
                      {msg.text && msg.text !== '🎵 [Nota de voz / Audio]' && (
                        <p className="msg-media-caption">{msg.text}</p>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'video' && (
                    <div className="msg-media-container">
                      {msg.media_url ? (
                        <video src={msg.media_url} controls className="msg-media-video" preload="metadata" />
                      ) : (
                        <span className="msg-fallback-tag">🎥 [Video]</span>
                      )}
                      {msg.text && msg.text !== '🎥 [Video]' && (
                        <p className="msg-media-caption">{msg.text}</p>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'document' && (
                    <div className="msg-doc-container">
                      {msg.media_url ? (
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="msg-doc-link">
                          📄 {msg.text || 'Descargar Documento'}
                        </a>
                      ) : (
                        <span className="msg-fallback-tag">{msg.text || '📄 [Documento]'}</span>
                      )}
                    </div>
                  )}

                  {(!msg.content_type || msg.content_type === 'text') && (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  )}

                  <div className="msg-meta">
                    <span>{timeStr}</span>
                    {!isInbound && (
                      <span title={msg.status} style={{ color: msg.status === 'read' ? '#60a5fa' : 'inherit' }}>
                        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Botón flotante para volver a los mensajes nuevos */}
      {showScrollBottomBtn && (
        <button
          type="button"
          className="btn-scroll-bottom"
          onClick={() => scrollToBottom('smooth')}
          title="Bajar a los mensajes más recientes"
        >
          ↓ Nuevos mensajes
        </button>
      )}

      {/* Barra de Entrada de Mensajes */}
      <footer className="chat-composer">
        <form onSubmit={handleSend} className="composer-form">
          <input
            type="text"
            className="composer-input"
            placeholder="Escribe una respuesta celestial como tarotista..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
          />

          <button
            type="submit"
            className="btn-send-message"
            disabled={!inputText.trim() || sending}
            title="Enviar mensaje (Enter)"
          >
            {sending ? '⏳' : '➤'}
          </button>
        </form>
      </footer>
    </section>
  );
}

export default ChatArea;
