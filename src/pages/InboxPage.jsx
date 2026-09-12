import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatList } from '../components/inbox/ChatList';
import { ChatArea } from '../components/inbox/ChatArea';
import { EmptyState } from '../components/inbox/EmptyState';
import { NotesPanel } from '../components/NotesPanel';
import { SalesDashboard } from '../components/SalesDashboard';
import { AutomationRulesManager } from '../components/AutomationRulesManager';
import { IntegrationsManager } from '../components/IntegrationsManager';
import { ReportBuilder } from '../components/ReportBuilder';
import { ContactsManager } from '../components/ContactsManager';
import { SearchResults } from '../components/SearchResults';
import { messageSearchService } from '../services/messageSearch.service';
import '../inbox.css';

export function InboxPage() {
  const { apiFetch, user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [sendBanner, setSendBanner] = useState(null);

  // Estados de modales y herramientas
  const [showSalesDashboard, setShowSalesDashboard] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

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

  // Actualizar un mensaje específico en memoria de inmediato (ej: marcado de visto)
  const handleMessageUpdate = useCallback((messageId, updates) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...updates } : m));
  }, []);

  return (
    <div className="inbox-layout">
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
      {showNotesPanel && selectedConversation && (
        <NotesPanel
          conversationId={selectedConversation.id}
          contactName={selectedConversation.contact_name}
          onClose={() => setShowNotesPanel(false)}
        />
      )}

      {/* Barra de herramientas para modales y paneles */}
      <div className="inbox-toolbar">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setShowSalesDashboard(true)}
          title="Panel de Ventas y Métricas"
        >
          📊
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setShowContacts(true)}
          title="Directorio de Contactos"
        >
          👥
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setShowReports(true)}
          title="Generador de Reportes"
        >
          📋
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setShowAutomation(true)}
          title="Reglas de Automatización"
        >
          ⚙️
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setShowIntegrations(true)}
          title="Integraciones y Webhooks"
        >
          🔌
        </button>
        {selectedConversation && (
          <button
            type="button"
            className={`toolbar-btn ${showNotesPanel ? 'active' : ''}`}
            onClick={() => setShowNotesPanel(v => !v)}
            title="Notas del contacto y etiquetas"
          >
            📝
          </button>
        )}
      </div>

      {/* Modales de características avanzadas */}
      {showSalesDashboard && (
        <SalesDashboard
          isOpen={showSalesDashboard}
          onClose={() => setShowSalesDashboard(false)}
        />
      )}

      {showContacts && (
        <ContactsManager
          onClose={() => setShowContacts(false)}
        />
      )}

      {showReports && (
        <ReportBuilder
          onClose={() => setShowReports(false)}
        />
      )}

      {showAutomation && (
        <AutomationRulesManager
          isOpen={showAutomation}
          onClose={() => setShowAutomation(false)}
        />
      )}

      {showIntegrations && (
        <IntegrationsManager
          isOpen={showIntegrations}
          onClose={() => setShowIntegrations(false)}
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
