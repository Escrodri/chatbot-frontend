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
    if (selectedId) {
      loadMessages(selectedId);
      const msgInterval = setInterval(() => loadMessages(selectedId), 3000);
      return () => clearInterval(msgInterval);
    }
  }, [selectedId, loadMessages]);

  const selectedConversation = conversations.find(c => c.id === selectedId) || null;

  // Enviar mensaje como operador
  const handleSendMessage = async (text) => {
    if (!selectedId || sending) return;
    setSending(true);

    try {
      const res = await apiFetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);

        // Actualizar último mensaje y pasar a Handover en la lista lateral
        setConversations(prev => prev.map(c => {
          if (c.id === selectedId) {
            return {
              ...c,
              last_message_text: text,
              last_message_time: new Date().toISOString(),
              bot_status: 'handed_over'
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
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
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

export default InboxPage;
