import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatList } from '../components/inbox/ChatList';
import { ChatArea } from '../components/inbox/ChatArea';
import { EmptyState } from '../components/inbox/EmptyState';
import '../inbox.css';

export function InboxPage() {
  const { apiFetch, user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [sendBanner, setSendBanner] = useState(null);

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
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
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
              lastPrev?.media_url === lastInc?.media_url
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
    }
  }, [apiFetch]);

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
      loadMessages(selectedId);
      const msgInterval = setInterval(() => loadMessages(selectedId), 3000);
      return () => clearInterval(msgInterval);
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

      setMessages(prev => [...prev, data.message]);

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

  return (
    <div className="inbox-layout">
      {/* Columna Izquierda: Lista de Chats */}
      <ChatList
        conversations={conversations}
        selectedId={selectedId}
        onSelectChat={setSelectedId}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Columna Derecha: Conversación Activa o Estado Vacío */}
      {selectedConversation ? (
        <ChatArea
          conversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          onToggleBot={handleToggleBot}
          sending={sending}
          sendBanner={sendBanner}
          onDismissBanner={() => setSendBanner(null)}
          onRetryMessage={handleRetryMessage}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

export default InboxPage;
