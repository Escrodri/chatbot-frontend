import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../../lib/api';

const PLATFORM_LABELS = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Messenger',
  messenger: 'Messenger'
};

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M2.4 21.2 22.6 12 2.4 2.8l.01 7.16L17 12 2.41 14.04z" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export function ChatArea({
  conversation,
  messages,
  onSendMessage,
  onToggleBot,
  sending,
  sendBanner = null,
  onDismissBanner = () => {}
}) {
  const [inputText, setInputText] = useState('');
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevConvIdRef = useRef(null);
  const prevMessagesCountRef = useRef(0);
  const prevLastMsgIdRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('El archivo supera el límite máximo permitido de 20MB.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    if ((!inputText.trim() && !selectedFile) || sending) return;

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        onSendMessage({
          text: inputText.trim(),
          fileBase64: reader.result,
          fileName: selectedFile.name,
          mimeType: selectedFile.type
        });
        setInputText('');
        handleRemoveFile();
        setTimeout(() => scrollToBottom('smooth'), 80);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      onSendMessage(inputText.trim());
      setInputText('');
      setTimeout(() => scrollToBottom('smooth'), 80);
    }
  };

  if (!conversation) return null;

  const isBotActive = conversation.bot_status === 'active';
  const platformLabel = PLATFORM_LABELS[conversation.platform] || conversation.platform || 'Canal';
  const windowStatus = conversation.window_status || { canSendFreeText: true };

  return (
    <section className="inbox-chat-area">
      {/* Cabecera del chat */}
      <header className="chat-header">
        <div className="chat-header-user">
          <div className="chat-header-avatar">
            {(conversation.contact_name || 'C').charAt(0).toUpperCase()}
          </div>
          <div className="chat-header-title">
            <h4>{conversation.contact_name || 'Contacto'}</h4>
            <span>
              {conversation.channel_name || platformLabel}
              {(conversation.contact_phone || conversation.channel_identifier)
                ? ` · ${conversation.contact_phone || conversation.channel_identifier}`
                : ''}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          {/* Indicador de ventana de mensajería */}
          <div className={`window-indicator ${windowStatus.canSendFreeText ? 'active' : 'warning'}`}>
            <span>{windowStatus.canSendFreeText ? 'Ventana 24 h activa' : 'Human Agent (7 días)'}</span>
          </div>

          {/* Switch de handover */}
          <button
            type="button"
            className={`btn-handover ${isBotActive ? 'bot-active' : 'human-active'}`}
            onClick={() => onToggleBot(conversation.id, isBotActive ? 'handed_over' : 'active')}
            title="Alternar entre respuesta automática del bot y atención humana"
          >
            <span>{isBotActive ? 'Bot activo' : 'Control humano'}</span>
          </button>
        </div>
      </header>

      {/* Hilo de mensajes */}
      <div className="chat-messages-thread" ref={chatContainerRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="thread-empty-note">
            No hay mensajes en esta conversación todavía.
          </div>
        ) : (
          messages.map(msg => {
            const isInbound = msg.direction === 'inbound';
            const isBot = msg.sender_type === 'bot';

            const isFailed = msg.status === 'failed';

            let bubbleClass = 'inbound';
            if (!isInbound) {
              bubbleClass = isBot ? 'bot' : 'agent';
            }
            if (isFailed) bubbleClass += ' failed';

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
                      {isBot ? 'Bot de bienvenida' : (msg.sender_user_name || 'Operador')}
                    </span>
                  )}

                  {/* Renderizado multimedia dinámico */}
                  {msg.content_type === 'sticker' && (
                    <div className="msg-sticker-container">
                      {msg.media_url ? (
                        <img src={apiUrl(msg.media_url)} alt="Sticker" className="msg-sticker-img" loading="lazy" />
                      ) : (
                        <span className="msg-fallback-tag">[Sticker]</span>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'image' && (
                    <div className="msg-media-container">
                      {msg.media_url ? (
                        <img
                          src={apiUrl(msg.media_url)}
                          alt="Imagen enviada"
                          className="msg-media-img"
                          loading="lazy"
                          onClick={() => window.open(apiUrl(msg.media_url), '_blank')}
                        />
                      ) : (
                        <span className="msg-fallback-tag">[Imagen]</span>
                      )}
                      {msg.text && msg.text !== '📷 [Imagen]' && (
                        <p className="msg-media-caption">{msg.text}</p>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'audio' && (
                    <div className="msg-audio-container">
                      {msg.media_url ? (
                        <audio src={apiUrl(msg.media_url)} controls className="msg-audio-player" preload="metadata" />
                      ) : (
                        <span className="msg-fallback-tag">[Nota de voz]</span>
                      )}
                      {msg.text && msg.text !== '🎵 [Nota de voz / Audio]' && (
                        <p className="msg-media-caption">{msg.text}</p>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'video' && (
                    <div className="msg-media-container">
                      {msg.media_url ? (
                        <video src={apiUrl(msg.media_url)} controls className="msg-media-video" preload="metadata" />
                      ) : (
                        <span className="msg-fallback-tag">[Video]</span>
                      )}
                      {msg.text && msg.text !== '🎥 [Video]' && (
                        <p className="msg-media-caption">{msg.text}</p>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'document' && (
                    <div className="msg-doc-container">
                      {msg.media_url ? (
                        <a href={apiUrl(msg.media_url)} target="_blank" rel="noopener noreferrer" className="msg-doc-link">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z" />
                            <path d="M14 2.5v5h5" />
                          </svg>
                          {msg.text || 'Descargar documento'}
                        </a>
                      ) : (
                        <span className="msg-fallback-tag">{msg.text || '[Documento]'}</span>
                      )}
                    </div>
                  )}

                  {(!msg.content_type || msg.content_type === 'text') && (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  )}

                  {/* Un mensaje que no salió se dice claramente, no con una tilde (A-02) */}
                  {isFailed && (
                    <div className="msg-failed-note">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7.5v5.5M12 16.4h.01" />
                      </svg>
                      <div>
                        <strong>No se envió.</strong>{' '}
                        {msg.error_details?.message || 'Meta rechazó el mensaje.'}
                        <button
                          type="button"
                          className="btn-retry-send"
                          onClick={() => onSendMessage(msg.text)}
                          disabled={sending}
                        >
                          Reintentar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="msg-meta">
                    <span>{timeStr}</span>
                    {!isInbound && !isFailed && (
                      <span title={msg.status} style={{ color: msg.status === 'read' ? 'var(--wa-blue)' : 'inherit' }}>
                        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'pending' ? '🕘' : '✓'}
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
          ↓ Mensajes nuevos
        </button>
      )}

      {/* Aviso de envío fallido */}
      {sendBanner && (
        <div className="send-banner" role="alert">
          <span>{sendBanner}</span>
          <button type="button" onClick={onDismissBanner} aria-label="Cerrar aviso">&times;</button>
        </div>
      )}

      {/* Barra de entrada de mensajes */}
      <footer className="chat-composer">
        {selectedFile && (
          <div className="composer-file-preview" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            marginBottom: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-gold)',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            {filePreview ? (
              <img src={filePreview} alt="Preview" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
            ) : (
              <span style={{ fontSize: '1.2rem' }}>📎</span>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
            <button
              type="button"
              onClick={handleRemoveFile}
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.2rem', padding: '0 6px' }}
              title="Quitar archivo adjunto"
            >
              &times;
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="composer-form">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn-card-action"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="Adjuntar archivo, imagen o documento"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-gold)' }}
          >
            <PaperclipIcon />
          </button>

          <input
            type="text"
            className="composer-input"
            placeholder={selectedFile ? "Añadí un comentario o descripción..." : "Escribí un mensaje..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
          />

          <button
            type="submit"
            className="btn-send-message"
            disabled={(!inputText.trim() && !selectedFile) || sending}
            title="Enviar mensaje (Enter)"
          >
            {sending ? '…' : <SendIcon />}
          </button>
        </form>
      </footer>
    </section>
  );
}

export default ChatArea;
