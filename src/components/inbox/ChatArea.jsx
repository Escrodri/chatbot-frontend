import React, { useState, useLayoutEffect, useRef } from 'react';
import { apiUrl } from '../../lib/api';
import { AudioPlayer } from './AudioPlayer';
import {
  IconoAlerta, IconoVenta, IconoDeCanal, IconoEnviar, IconoMicrofono,
  IconoClip, IconoEliminar
} from '../Icons';
import { useAuth } from '../../context/AuthContext';

/**
 * Dirección del archivo multimedia de un mensaje.
 *
 * Se pide al backend por el id del mensaje, no por la ruta del archivo: así el
 * servidor puede volver a bajarlo de Meta si su copia local se perdió (el disco
 * del hosting se borra en cada despliegue), y de paso los archivos dejan de
 * estar accesibles sin sesión.
 * Pasa el token en la query (?token=...) para que etiquetas <img>, <audio> y <video>
 * puedan autenticar sin depender de cookies cross-site de terceros.
 */
function mediaSrc(msg, token) {
  if (!msg) return null;
  // Si alguna vez llega una URL absoluta (por ejemplo Cloudinary o directa de Meta), se respeta.
  const u = msg.media_url || '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (!msg.media_url && !msg.meta_media_id) return null;
  const base = apiUrl(`/api/media/${msg.id}`);
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

const PLATFORM_LABELS = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Messenger',
  messenger: 'Messenger'
};

// Los íconos vienen del conjunto común: mismo trazo, mismo tamaño y mismo
// comportamiento en tema claro y oscuro que el resto de la aplicación.
const SendIcon = () => <IconoEnviar size={20} />;
const MicIcon = () => <IconoMicrofono size={20} />;
const TrashIcon = () => <IconoEliminar size={18} />;
const PaperclipIcon = () => <IconoClip size={20} />;

export function ChatArea({
  conversation,
  messages,
  loadingMessages = false,
  onSendMessage,
  onToggleBot,
  sending,
  sendBanner = null,
  onDismissBanner = () => {},
  onRetryMessage = null,
  onRegisterSale = null
}) {
  const { token } = useAuth();
  const [inputText, setInputText] = useState('');
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleAmount, setSaleAmount] = useState('');
  const [saleCurrency, setSaleCurrency] = useState('PYG');
  const [saleNote, setSaleNote] = useState('');
  const [saleProduct, setSaleProduct] = useState('');
  const [savingSale, setSavingSale] = useState(false);

  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Rastrear el id de la conversación activa para reiniciar los flags inmediatamente
  const convId = conversation?.id;
  const activeConvIdRef = useRef(convId);
  const initialScrollDoneRef = useRef(false);
  const prevMessagesCountRef = useRef(0);
  const prevLastMsgIdRef = useRef(null);

  if (activeConvIdRef.current !== convId) {
    activeConvIdRef.current = convId;
    initialScrollDoneRef.current = false;
    prevMessagesCountRef.current = 0;
    prevLastMsgIdRef.current = null;
  }

  // Limpieza al desmontar o cambiar de chat si se estaba grabando
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('El archivo supera el límite máximo permitido de 20MB.');
      return;
    }

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else if (
      file.type.startsWith('audio/') ||
      ['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.opus'].some(ext => file.name.toLowerCase().endsWith(ext))
    ) {
      setFilePreview(null);
      setAudioPreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
      setAudioPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Iniciar grabación de nota de voz con el micrófono
  const startRecording = async () => {
    if (sending || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Tu navegador no tiene soporte para grabación de micrófono o requiere conexión segura (HTTPS/localhost).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mime = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mime = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mime = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mime = 'audio/webm';
        }
      }

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      alert('No se pudo acceder al micrófono. Por favor permite el acceso al micrófono en los permisos de tu navegador.');
    }
  };

  // Cancelar y descartar grabación
  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Detener y enviar nota de voz
  const sendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }

      const recordedMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: recordedMime });
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingDuration(0);

      if (audioBlob.size === 0) return;

      let ext = '.webm';
      if (recordedMime.includes('ogg')) ext = '.ogg';
      else if (recordedMime.includes('mp4') || recordedMime.includes('m4a')) ext = '.m4a';
      else if (recordedMime.includes('wav')) ext = '.wav';

      const fileName = `nota_de_voz_${Date.now()}${ext}`;
      const reader = new FileReader();
      reader.onloadend = () => {
        onSendMessage({
          text: '🎵 [Nota de voz]',
          fileBase64: reader.result,
          fileName,
          mimeType: recordedMime
        });
        setTimeout(() => scrollToBottom('smooth'), 80);
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
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
      if (behavior === 'auto') {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      } else {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    isNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
  };

  // Mantener el scroll anclado abajo cuando imágenes/multimedia terminan de renderizar
  const handleMediaLoad = () => {
    if (isNearBottomRef.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Posicionamiento de scroll:
  // useLayoutEffect se ejecuta de forma síncrona ANTES de que el navegador dibuje en pantalla.
  // Así el chat aparece directamente abajo sin ningún parpadeo ni animación de bajada.
  useLayoutEffect(() => {
    if (!conversation) return;

    // 1. Carga inicial del chat o llegada por primera vez de mensajes:
    if (!initialScrollDoneRef.current) {
      if (messages.length > 0) {
        if (chatContainerRef.current) {
          // Posicionamiento instantáneo al fondo sin animación
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        initialScrollDoneRef.current = true;
        prevMessagesCountRef.current = messages.length;
        prevLastMsgIdRef.current = messages[messages.length - 1]?.id || null;
        isNearBottomRef.current = true;
        setShowScrollBottomBtn(false);

        // Doble fijación en el siguiente ciclo por si el DOM calculó fuentes/estilos
        requestAnimationFrame(() => {
          if (chatContainerRef.current && isNearBottomRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        });
      }
      return;
    }

    // 2. Si ya cargó inicialmente este chat, detectar si realmente entraron mensajes nuevos
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
  }, [messages, conversation]);

  const cerrarFormularioVenta = () => {
    setShowSaleForm(false);
    setSaleAmount('');
    setSaleNote('');
    setSaleProduct('');
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (savingSale || !onRegisterSale) return;

    setSavingSale(true);
    try {
      const registrada = await onRegisterSale(conversation.id, {
        value: saleAmount.trim() === '' ? null : saleAmount.trim(),
        currency: saleCurrency,
        product: saleProduct.trim() || null,
        note: saleNote.trim() || null
      });
      if (registrada) cerrarFormularioVenta();
    } finally {
      setSavingSale(false);
    }
  };

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
            {conversation.contact_avatar ? (
              <img
                src={conversation.contact_avatar}
                alt={conversation.contact_name || 'Contacto'}
                className="chat-avatar-img"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              (conversation.contact_name || 'C').charAt(0).toUpperCase()
            )}
          </div>
          <div className="chat-header-title">
            <h4>{conversation.contact_name || 'Contacto'}</h4>
            <span>
              <IconoDeCanal platform={conversation.platform} size={13} />
              {conversation.channel_name || platformLabel}
              {(conversation.contact_phone || conversation.channel_identifier)
                ? ` · ${conversation.contact_phone || conversation.channel_identifier}`
                : ''}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          {/* Indicador de ventana de mensajería */}
          {/* Dato de estado, no una acción: por eso no tiene forma de botón. */}
          <div className={`window-indicator ${windowStatus.canSendFreeText ? 'active' : 'warning'}`}>
            <span>{windowStatus.canSendFreeText ? 'Podés escribir libremente' : 'Fuera de las 24 h'}</span>
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

          {/* Marcar la conversación como venta e informarla a Meta */}
          {onRegisterSale && (
            <button
              type="button"
              className="btn-sale"
              onClick={() => setShowSaleForm(v => !v)}
              title="Registrar una venta hecha en esta conversación"
            >
              <IconoVenta size={15} />
              <span>Marcar venta</span>
            </button>
          )}
        </div>
      </header>

      {showSaleForm && onRegisterSale && (
        <form className="sale-form" onSubmit={handleSaleSubmit}>
          <div className="sale-form-fields">
            <label>
              <span>Monto</span>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                autoFocus
              />
            </label>

            <label>
              <span>Moneda</span>
              <select value={saleCurrency} onChange={(e) => setSaleCurrency(e.target.value)}>
                <option value="PYG">Guaraníes (PYG)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="ARS">Pesos argentinos (ARS)</option>
                <option value="BRL">Reales (BRL)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
            </label>

            <label>
              <span>Producto</span>
              <input
                type="text"
                placeholder="Ej: Cactus"
                value={saleProduct}
                onChange={(e) => setSaleProduct(e.target.value)}
                maxLength={200}
              />
            </label>

            <label className="sale-form-note">
              <span>Detalle (opcional)</span>
              <input
                type="text"
                placeholder="Qué se vendió"
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
                maxLength={200}
              />
            </label>
          </div>

          <div className="sale-form-actions">
            <button type="button" className="btn-sale-cancel" onClick={cerrarFormularioVenta} disabled={savingSale}>
              Cancelar
            </button>
            <button type="submit" className="btn-sale-confirm" disabled={savingSale}>
              {savingSale ? 'Registrando…' : 'Registrar venta'}
            </button>
          </div>

          <p className="sale-form-hint sale-form-hint-neutral">
            Escribí el producto siempre igual: con ese nombre se arman en Meta las
            conversiones por producto, y si varía la escritura quedan separadas.
          </p>

          {conversation.platform === 'whatsapp' && !conversation.ctwa_clid && (
            <p className="sale-form-hint">
              Esta conversación no empezó desde un anuncio, así que la venta se guarda
              pero Meta no la va a poder atribuir a ninguna campaña.
            </p>
          )}
        </form>
      )}

      {/* Hilo de mensajes */}
      <div className="chat-messages-thread" ref={chatContainerRef} onScroll={handleScroll}>
        {loadingMessages ? (
          <div className="thread-loading-state">
            <div className="thread-spinner" />
            <span>Cargando conversación...</span>
          </div>
        ) : messages.length === 0 ? (
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
                  {/* Solo se aclara quién habló cuando no es obvio: los mensajes
                      del bot. Poner el nombre del operador arriba de cada burbuja
                      propia es ruido, ningún chat lo hace. */}
                  {!isInbound && isBot && (
                    <span className="msg-sender-tag bot">Bot de bienvenida</span>
                  )}

                  {/* Renderizado multimedia dinámico */}
                  {msg.content_type === 'sticker' && (
                    <div className="msg-sticker-container">
                      {msg.media_url ? (
                        <img
                          src={mediaSrc(msg, token)}
                          alt="Sticker"
                          className="msg-sticker-img"
                          loading="lazy"
                          onLoad={handleMediaLoad}
                          onError={(e) => {
                            if (msg.media_url && !e.currentTarget.dataset.fallbackTried) {
                              e.currentTarget.dataset.fallbackTried = 'true';
                              e.currentTarget.src = apiUrl(msg.media_url);
                            }
                          }}
                        />
                      ) : (
                        <span className="msg-fallback-tag">[Sticker]</span>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'image' && (
                    <div className="msg-media-container">
                      {msg.media_url ? (
                        <img
                          src={mediaSrc(msg, token)}
                          alt="Imagen enviada"
                          className="msg-media-img"
                          loading="lazy"
                          onLoad={handleMediaLoad}
                          onError={(e) => {
                            if (msg.media_url && !e.currentTarget.dataset.fallbackTried) {
                              e.currentTarget.dataset.fallbackTried = 'true';
                              e.currentTarget.src = apiUrl(msg.media_url);
                            }
                          }}
                          onClick={() => window.open(mediaSrc(msg, token) || apiUrl(msg.media_url), '_blank')}
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
                        <AudioPlayer src={mediaSrc(msg, token)} propio={!isInbound} />
                      ) : (
                        <span className="msg-fallback-tag">[Nota de voz]</span>
                      )}
                      {msg.text && !['🎵 [Nota de voz]', '🎵 [Nota de voz / Audio]'].includes(msg.text) && (
                        <p className="msg-media-caption">{msg.text}</p>
                      )}
                    </div>
                  )}

                  {msg.content_type === 'video' && (
                    <div className="msg-media-container">
                      {msg.media_url ? (
                        <video src={mediaSrc(msg, token)} controls className="msg-media-video" preload="metadata" />
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
                        <a href={mediaSrc(msg, token) || apiUrl(msg.media_url)} target="_blank" rel="noopener noreferrer" className="msg-doc-link">
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
                      <IconoAlerta size={14} />
                      <div>
                        <strong>No se envió.</strong>{' '}
                        {msg.error_details?.message || 'Meta rechazó el mensaje.'}
                        <button
                          type="button"
                          className="btn-retry-send"
                          onClick={() => (
                            onRetryMessage ? onRetryMessage(msg.id) : onSendMessage(msg.text)
                          )}
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
            ) : audioPreviewUrl ? (
              <AudioPlayer src={audioPreviewUrl} />
            ) : (
              <IconoClip size={20} />
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

        {isRecording ? (
          <div className="composer-recording-bar">
            <button
              type="button"
              className="btn-recording-cancel"
              onClick={cancelRecording}
              title="Cancelar y descartar grabación"
            >
              <TrashIcon />
            </button>

            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span className="recording-timer">{formatDuration(recordingDuration)}</span>
              <div className="recording-wave">
                <span></span><span></span><span></span><span></span>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginLeft: '4px' }}>
                Grabando nota de voz...
              </span>
            </div>

            <button
              type="button"
              className="btn-send-message"
              onClick={sendRecording}
              title="Enviar nota de voz"
              style={{ background: '#25D366' }}
            >
              <SendIcon />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="composer-form">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ogg,.mp3,.wav,.m4a"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn-card-action"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              title="Adjuntar archivo, imagen, audio o documento"
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

            {inputText.trim() || selectedFile ? (
              <button
                type="submit"
                className="btn-send-message"
                disabled={sending}
                title="Enviar mensaje (Enter)"
              >
                {sending ? '…' : <SendIcon />}
              </button>
            ) : (
              <button
                type="button"
                className="btn-mic"
                onClick={startRecording}
                disabled={sending}
                title="Grabar nota de voz"
              >
                <MicIcon />
              </button>
            )}
          </form>
        )}
      </footer>
    </section>
  );
}

export default ChatArea;
