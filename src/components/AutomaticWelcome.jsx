import React, { useEffect, useState } from 'react';
import cvFormService from '../services/cvFormService';

/**
 * AutomaticWelcome Component
 * Detecta nuevos usuarios y envía automáticamente:
 * 1. Mensaje de bienvenida
 * 2. Componente con botones para seleccionar tipo de CV
 */
export function AutomaticWelcome({
  conversation,
  messages = [],
  isBot = true,
  onSendAutoMessage,
  onCVTypeSelected
}) {
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  // Detectar si es un usuario nuevo y enviar bienvenida automática
  useEffect(() => {
    // Solo si:
    // 1. El bot está activo
    // 2. Es la primera vez que se abre esta conversación
    // 3. No hay mensajes previos
    // 4. No hemos mostrado la bienvenida aún
    if (
      isBot &&
      (!messages || messages.length === 0) &&
      !hasShownWelcome &&
      conversation
    ) {
      sendWelcomeMessage();
      setHasShownWelcome(true);
    }
  }, [conversation?.id, isBot, messages?.length, hasShownWelcome]);

  const sendWelcomeMessage = async () => {
    if (onSendAutoMessage) {
      const welcomeText = cvFormService.getWelcomeMessage();

      // Esperar un poco para que parezca natural
      await new Promise(resolve => setTimeout(resolve, 300));

      // Enviar mensaje de bienvenida
      onSendAutoMessage(welcomeText, { isBot: true, isAutomatic: true });

      // Esperar otro poco antes de mostrar los botones
      await new Promise(resolve => setTimeout(resolve, 400));

      // Enviar componente con botones para seleccionar tipo de CV
      onSendAutoMessage(null, {
        isBot: true,
        isAutomatic: true,
        component: 'CVTypeSelector',
        onSelectType: onCVTypeSelected
      });
    }
  };

  // El componente no renderiza nada en la UI
  // Solo maneja la lógica de envío automático de mensajes
  return null;
}

export default AutomaticWelcome;
