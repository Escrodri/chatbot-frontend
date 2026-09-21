import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChatList } from '../components/inbox/ChatList';
import { ChatArea } from '../components/inbox/ChatArea';
import { EmptyState } from '../components/inbox/EmptyState';
import { NotesPanel } from '../components/NotesPanel';
import { OrderPanel } from '../components/inbox/OrderPanel';
import { ContactsManager } from '../components/ContactsManager';
import { SearchResults } from '../components/SearchResults';
import { AutomationAlert } from '../components/inbox/AutomationAlert';
import { messageSearchService } from '../services/messageSearch.service';
import { automationService } from '../services/automation.service';
import { ordersService } from '../services/orders.service';
import '../inbox.css';

export function InboxPage() {
  const { apiFetch, user, token } = useAuth();

  // "Abrir chat" desde el tablero de Pedidos llega como /inbox?conversation=12.
  // Sin esto la bandeja se abría vacía y el botón parecía roto.
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [sendBanner, setSendBanner] = useState(null);

  // Estados de modales y herramientas
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Estado de la automatización. Se consulta cada 20 segundos: no hace falta
  // más, porque el aviso es para que una persona tome el chat, no para
  // reaccionar al milisegundo.
  const [automationEstado, setAutomationEstado] = useState(null);

  // Estado del pedido manejado desde el propio chat, sin ir al tablero.
  const [cambiandoPedido, setCambiandoPedido] = useState(false);
  const [avisoPedido, setAvisoPedido] = useState(null);

  // Indexar conversaciones para búsqueda avanzada de mensajes
  useEffect(() => {
    if (conversations.length > 0) {
      messageSearchService.indexMessages(conversations);
    }
  }, [conversations]);

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      const results = messageSearchService.search(query, 50);
      if (results && results.length > 0) {
        setSearchResults(results);
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    } else {
      setShowSearchResults(false);
    }
  };

  // Cargar lista de conversaciones
  const loadConversations = useCallback(async () => {
    try {
      const res = await apiFetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
    }
  }, [apiFetch]);

  // Cargar mensajes de la conversación seleccionada
  const loadMessages = useCallback(async (convId, isInitial = false) => {
    if (!convId) return;
    if (isInitial) setLoadingMessages(true);
    try {
      const res = await apiFetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const incoming = data.messages || [];
        setMessages(prev => {
          if (prev.length === incoming.length && prev.length > 0) {
            const lastPrev = prev[prev.length - 1];
            const lastInc = incoming[incoming.length - 1];
            if (
              lastPrev?.id === lastInc?.id &&
              lastPrev?.status === lastInc?.status &&
              lastPrev?.media_url === lastInc?.media_url &&
              lastPrev?.viewed_at === lastInc?.viewed_at
            ) {
              return prev; // Evita re-renders innecesarios si no hay cambios
            }
          }
          return incoming;
        });

        // Actualizar en el estado local que se leyeron los no leídos
        setConversations(prev => prev.map(c => c.id === convId && c.unread_count > 0 ? { ...c, unread_count: 0 } : c));
      }
    } catch (err) {
      console.error('Error al cargar mensajes:', err);
    } finally {
      if (isInitial) setLoadingMessages(false);
    }
  }, [apiFetch]);

  // Selección inmediata de chat: limpia el chat previo sincrónicamente en el mismo batch
  const handleSelectChat = useCallback((id) => {
    if (id === selectedId) return;
    setSendBanner(null);
    setAvisoPedido(null);
    setMessages([]);
    setLoadingMessages(true);
    setSelectedId(id);
  }, [selectedId]);

  // Polling suave para sincronización en tiempo real
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Selección por dirección: se aplica una sola vez, cuando la conversación ya
  // está en la lista. Después se limpia el parámetro para que refrescar la
  // página no vuelva a arrastrar al asesor al mismo chat.
  useEffect(() => {
    const pedido = searchParams.get('conversation');
    if (!pedido) return;

    const id = parseInt(pedido, 10);
    if (isNaN(id)) return;

    if (conversations.some(c => c.id === id)) {
      setSelectedId(id);
      searchParams.delete('conversation');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, conversations]);

  // Vigilancia de la automatización. Si n8n deja de atender, el cliente escribe
  // y nadie contesta: sin esto, el silencio no se distingue de un chat tranquilo.
  const loadAutomationEstado = useCallback(async () => {
    try {
      setAutomationEstado(await automationService.obtenerEstado(apiFetch));
    } catch (err) {
      // Que falle la consulta de diagnóstico no puede ensuciar la bandeja.
      console.error('Error al consultar el estado de la automatización:', err);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadAutomationEstado();
    const interval = setInterval(loadAutomationEstado, 20000);
    return () => clearInterval(interval);
  }, [loadAutomationEstado]);

  // Al cambiar conversación seleccionada
  useEffect(() => {
    setSendBanner(null);
    if (selectedId) {
      loadMessages(selectedId, true);
      const msgInterval = setInterval(() => loadMessages(selectedId, false), 3000);
      return () => clearInterval(msgInterval);
    } else {
      setMessages([]);
      setLoadingMessages(false);
    }
  }, [selectedId, loadMessages]);

  const selectedConversation = conversations.find(c => c.id === selectedId) || null;

  // Reintentar un mensaje que Meta rechazó.
  // Se le pide al backend que vuelva a despachar el mensaje guardado, con su
  // adjunto: mandar de nuevo solo el texto perdía el archivo.
  const handleRetryMessage = async (messageId) => {
    if (!selectedId || !messageId || sending) return;

    setSending(true);
    setSendBanner(null);

    try {
      const res = await apiFetch(`/api/conversations/${selectedId}/messages/${messageId}/retry`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSendBanner(data.error || 'No se pudo reintentar el envío.');
        return;
      }

      if (data.delivered) {
        setMessages(prev => prev.map(m => (
          m.id === messageId ? { ...m, status: 'sent', error_details: null } : m
        )));
      } else {
        setSendBanner(data.error?.message || 'Meta volvió a rechazar el mensaje.');
      }
    } catch (err) {
      setSendBanner('No se pudo reintentar el envío. Revisá tu conexión.');
    } finally {
      setSending(false);
    }
  };

  // Registrar una venta hecha en la conversación e informársela a Meta.
  // Devuelve true si quedó guardada, para que el formulario se cierre solo.
  const handleRegisterSale = async (conversationId, { value, currency, note, product }) => {
    if (!conversationId) return false;

    setSendBanner(null);

    try {
      const res = await apiFetch(`/api/conversations/${conversationId}/sale`, {
        method: 'POST',
        body: JSON.stringify({ value, currency, note, product })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSendBanner(data.error || 'No se pudo registrar la venta.');
        return false;
      }

      // La venta siempre queda guardada; el aviso solo cuenta si Meta no la tomó.
      setSendBanner(
        data.reported
          ? null
          : (data.warning?.message || 'La venta quedó registrada, pero no se le pudo informar a Meta.')
      );
      return true;
    } catch (err) {
      setSendBanner('No se pudo registrar la venta. Revisá tu conexión.');
      return false;
    }
  };

  // Enviar mensaje como operador
  const handleSendMessage = async (payload) => {
    if (!selectedId || sending) return;
    const bodyObj = typeof payload === 'string' ? { text: payload } : payload;
    const { text, fileBase64, fileName } = bodyObj;
    if ((!text || !text.trim()) && !fileBase64) return;

    setSending(true);
    setSendBanner(null);

    try {
      const res = await apiFetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify(bodyObj)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // El servidor rechazó la petición: la sesión venció, no hay permiso, etc.
        setSendBanner(data.error || 'No se pudo enviar el mensaje. Revisá tu conexión.');
        return;
      }

      if (data.message) {
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === data.message.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...data.message };
            return updated;
          }
          return [...prev, data.message];
        });
      }

      // El backend avisa si Meta aceptó el mensaje o no (A-02).
      setSendBanner(data.delivered ? null : (data.error?.message || 'El mensaje no pudo entregarse.'));

      // Actualizar último mensaje y pasar a Handover en la lista lateral
      const displayPreview = text || (fileName ? `[Archivo: ${fileName}]` : 'Archivo adjunto');
      setConversations(prev => prev.map(c => {
        if (c.id === selectedId) {
          return {
            ...c,
            last_message_text: displayPreview,
            last_message_time: new Date().toISOString(),
            bot_status: 'handed_over'
          };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      setSendBanner('No se pudo contactar al servidor. El mensaje no salió.');
    } finally {
      setSending(false);
    }
  };

  // Alternar estado del bot (Handover switch)
  const handleToggleBot = async (convId, newStatus) => {
    try {
      const res = await apiFetch(`/api/conversations/${convId}/bot-toggle`, {
        method: 'POST',
        body: JSON.stringify({ botStatus: newStatus })
      });

      if (res.ok) {
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return { ...c, bot_status: newStatus };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error('Error al cambiar estado del bot:', err);
    }
  };

  /**
   * Confirma o rechaza el pedido del chat abierto.
   *
   * Confirmar dispara la entrega del enlace; rechazar manda el aviso de que la
   * transferencia todavía no figura. Los dos avisan al cliente: el backend se
   * encarga, acá solo se muestra qué pasó.
   */
  const cambiarEstadoPedido = useCallback(async (nuevoEstado) => {
    const conv = conversations.find(c => c.id === selectedId);
    if (!conv?.order_id) return;

    const texto = nuevoEstado === 'pagado'
      ? `Vas a confirmar el pago de ${conv.contact_name || 'este cliente'} y mandarle el material.\n\nHacelo solo si ya viste la transferencia en el extracto del banco.`
      : `Le vas a avisar a ${conv.contact_name || 'este cliente'} que la transferencia todavía no figura acreditada, y que mande la captura de nuevo.`;

    if (!window.confirm(texto)) return;

    setCambiandoPedido(true);
    setAvisoPedido(null);
    try {
      const res = await ordersService.cambiarEstado(token, conv.order_id, nuevoEstado);
      const entrega = res.entrega;
      setAvisoPedido(
        entrega?.enviado
          ? { ok: true, texto: 'Mensaje enviado al cliente.' }
          : { ok: false, texto: entrega?.detalle || 'Se guardó el estado, pero el mensaje no salió.' }
      );
      await loadConversations();
      await loadMessages(conv.id, false);
    } catch (err) {
      setAvisoPedido({ ok: false, texto: err.message });
    } finally {
      setCambiandoPedido(false);
    }
  }, [conversations, selectedId, token, loadConversations, loadMessages]);

  // Actualizar un mensaje específico en memoria de inmediato (ej: marcado de visto)
  const handleMessageUpdate = useCallback((messageId, updates) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...updates } : m));
  }, []);

  return (
    <div className="inbox-layout">
      {/* Aviso de que las respuestas automáticas no están saliendo */}
      <AutomationAlert
        estado={automationEstado}
        apiFetch={apiFetch}
        onCerrar={() => setAutomationEstado(prev => (prev ? { ...prev, hayProblema: false } : prev))}
      />

      {/* Columna Izquierda: Lista de Chats */}
      <ChatList
        conversations={conversations}
        selectedId={selectedId}
        onSelectChat={handleSelectChat}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Columna Derecha: Conversación Activa o Estado Vacío */}
      {selectedConversation ? (
        <ChatArea
          key={selectedConversation.id}
          conversation={selectedConversation}
          messages={messages}
          loadingMessages={loadingMessages}
          onSendMessage={handleSendMessage}
          onToggleBot={handleToggleBot}
          sending={sending}
          sendBanner={sendBanner}
          onDismissBanner={() => setSendBanner(null)}
          onRetryMessage={handleRetryMessage}
          onRegisterSale={handleRegisterSale}
          onMessageUpdate={handleMessageUpdate}
        />
      ) : (
        <EmptyState />
      )}

      {/* Panel lateral de notas del contacto */}
      {showOrderPanel && selectedConversation && (
        <OrderPanel
          conversationId={selectedConversation.id}
          contactName={selectedConversation.contact_name}
          onClose={() => setShowOrderPanel(false)}
        />
      )}

      {showNotesPanel && selectedConversation && (
        <NotesPanel
          conversation={selectedConversation}
          onClose={() => setShowNotesPanel(false)}
        />
      )}

      {/* Barra lateral del chat: estado del pedido y accesos a los paneles.
          Antes eran tres emojis sin texto y nadie sabía qué hacía cada uno. */}
      <div className="inbox-toolbar" style={{ minWidth: '168px', alignItems: 'stretch', gap: '8px' }}>
        {selectedConversation && (
          <div style={{
            padding: '10px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--bg-hover)',
            fontSize: '.78rem', lineHeight: 1.45
          }}>
            <div style={{ color: 'var(--text-soft)', marginBottom: '3px' }}>Pedido</div>
            <div style={{ fontWeight: 600 }}>
              {selectedConversation.order_status
                ? ordersService.estado(selectedConversation.order_status).etiqueta
                : 'Sin pedido'}
            </div>
            {selectedConversation.order_product_name && (
              <div style={{ color: 'var(--text-soft)', marginTop: '2px' }}>
                {selectedConversation.order_product_name}
              </div>
            )}

            {selectedConversation.order_id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '9px' }}>
                {['comprobante_recibido', 'interesado', 'pagado'].includes(selectedConversation.order_status) && (
                  <button
                    type="button"
                    disabled={cambiandoPedido}
                    onClick={() => cambiarEstadoPedido('pagado')}
                    style={{
                      fontSize: '.76rem', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                      border: '1px solid #04785733', background: 'rgba(16,185,129,.16)', color: '#047857', fontWeight: 600
                    }}
                  >
                    {cambiandoPedido ? 'Enviando…' : 'Confirmar y entregar'}
                  </button>
                )}
                {selectedConversation.order_status === 'comprobante_recibido' && (
                  <button
                    type="button"
                    disabled={cambiandoPedido}
                    onClick={() => cambiarEstadoPedido('rechazado')}
                    style={{
                      fontSize: '.76rem', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                      border: '1px solid #b91c1c33', background: 'rgba(239,68,68,.12)', color: '#b91c1c', fontWeight: 600
                    }}
                  >
                    No figura aún
                  </button>
                )}
              </div>
            )}

            {avisoPedido && (
              <div style={{ marginTop: '8px', color: avisoPedido.ok ? '#065f46' : '#b45309' }}>
                {avisoPedido.texto}
              </div>
            )}
          </div>
        )}

        <button type="button" className="toolbar-btn" style={{ width: 'auto', height: 'auto', padding: '8px', fontSize: '.78rem' }}
          onClick={() => setShowContacts(true)}>
          Contactos
        </button>

        {selectedConversation && (
          <button type="button" className={`toolbar-btn ${showOrderPanel ? 'active' : ''}`}
            style={{ width: 'auto', height: 'auto', padding: '8px', fontSize: '.78rem' }}
            onClick={() => setShowOrderPanel(v => !v)}>
            Ver pedidos
          </button>
        )}

        {selectedConversation && (
          <button type="button" className={`toolbar-btn ${showNotesPanel ? 'active' : ''}`}
            style={{ width: 'auto', height: 'auto', padding: '8px', fontSize: '.78rem' }}
            onClick={() => setShowNotesPanel(v => !v)}>
            Notas y etiquetas
          </button>
        )}
      </div>

      {/* Modales de características avanzadas */}
      {showContacts && (
        <ContactsManager
          onClose={() => setShowContacts(false)}
          onAbrirChat={handleSelectChat}
        />
      )}

      {showSearchResults && (
        <SearchResults
          results={searchResults}
          onSelectResult={(conversationId) => {
            setSelectedId(conversationId);
            setShowSearchResults(false);
          }}
          onClose={() => setShowSearchResults(false)}
        />
      )}
    </div>
  );
}

export default InboxPage;
