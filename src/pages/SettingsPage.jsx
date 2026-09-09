import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { apiFetch } = useAuth();

  // Pestaña activa
  const [activeTab, setActiveTab] = useState('channels');

  // Estados de datos
  const [channels, setChannels] = useState([]);
  const [botSettings, setBotSettings] = useState({
    is_enabled: true,
    welcome_message: '',
    inactivity_hours: 24
  });
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsLimit, setLogsLimit] = useState(50);

  // Estados de modales
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [jsonModalContent, setJsonModalContent] = useState(null);
  // Estados de Escáner de Facebook / Messenger
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanToken, setScanToken] = useState('');
  const [metaAppId, setMetaAppId] = useState('');
  const [metaConfigId, setMetaConfigId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedPages, setScannedPages] = useState([]);
  const [selectedPagesToConnect, setSelectedPagesToConnect] = useState([]);
  const [connectingPages, setConnectingPages] = useState(false);
  const [scanError, setScanError] = useState('');
  const [missingPerms, setMissingPerms] = useState([]);

  // Formulario nuevo canal
  const [channelForm, setChannelForm] = useState({
    platform: 'whatsapp',
    name: '',
    channelIdentifier: '',
    accessToken: '',
    appId: '',
    appSecret: '',
    colorTag: '#00a884'
  });
  const [channelSubmitting, setChannelSubmitting] = useState(false);

  // Formulario editar canal
  const [editingChannel, setEditingChannel] = useState(null);
  const [editChannelForm, setEditChannelForm] = useState({
    name: '',
    channelIdentifier: '',
    accessToken: '',
    colorTag: '#00a884',
    status: 'active'
  });
  const [editChannelSubmitting, setEditChannelSubmitting] = useState(false);
  const [testingChannelId, setTestingChannelId] = useState(null);


  // Formulario nuevo usuario
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    channelIds: []
  });
  const [userSubmitting, setUserSubmitting] = useState(false);

  // Asignación de canales a un operador ya existente (A-03)
  const [channelsModalUser, setChannelsModalUser] = useState(null);
  const [channelsDraft, setChannelsDraft] = useState([]);
  const [channelsSaving, setChannelsSaving] = useState(false);

  // Bot guardado
  const [botSaving, setBotSaving] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Cargar canales
  const loadChannels = async () => {
    try {
      const res = await apiFetch('/api/settings/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (err) {
      console.error('Error al cargar canales:', err);
    }
  };

  // Cargar bot
  const loadBotSettings = async () => {
    try {
      const res = await apiFetch('/api/settings/bot');
      if (res.ok) {
        const data = await res.json();
        setBotSettings({
          is_enabled: data.is_enabled !== false,
          welcome_message: data.welcome_message || '',
          inactivity_hours: data.inactivity_hours || 24
        });
      }
    } catch (err) {
      console.error('Error al cargar configuración del bot:', err);
    }
  };

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      const res = await apiFetch('/api/settings/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  // Cargar logs
  const loadLogs = async (limit = logsLimit) => {
    try {
      const res = await apiFetch(`/api/settings/logs?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error al cargar logs:', err);
    }
  };

  useEffect(() => {
    loadChannels();
    loadBotSettings();
    loadUsers();
    loadLogs();
    loadMetaAppInfo();
  }, []);

  // Handler: Crear Canal
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    setChannelSubmitting(true);

    try {
      const res = await apiFetch('/api/settings/channels', {
        method: 'POST',
        body: JSON.stringify(channelForm)
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Error al conectar el canal', 'error');
        return;
      }

      addToast('Canal conectado con éxito y credenciales cifradas con AES-256-GCM', 'success');
      setShowChannelModal(false);
      setChannelForm({
        platform: 'whatsapp',
        name: '',
        channelIdentifier: '',
        accessToken: '',
        appId: '',
        appSecret: '',
        colorTag: '#00a884'
      });
      loadChannels();
    } catch (err) {
      addToast('Error al conectar canal: ' + err.message, 'error');
    } finally {
      setChannelSubmitting(false);
    }
  };

  // Handler: Abrir Modal Editar Canal
  const handleOpenEditChannel = (channel) => {
    setEditingChannel(channel);
    setEditChannelForm({
      name: channel.name || '',
      channelIdentifier: channel.channel_identifier || '',
      accessToken: '',
      colorTag: channel.color_tag || '#00a884',
      status: channel.status || 'active'
    });
  };

  // Handler: Actualizar Canal
  const handleUpdateChannel = async (e) => {
    e.preventDefault();
    if (!editingChannel) return;
    setEditChannelSubmitting(true);

    try {
      const payload = {
        name: editChannelForm.name.trim(),
        channelIdentifier: editChannelForm.channelIdentifier.trim(),
        colorTag: editChannelForm.colorTag,
        status: editChannelForm.status
      };
      if (editChannelForm.accessToken && editChannelForm.accessToken.trim()) {
        payload.accessToken = editChannelForm.accessToken.trim();
      }

      const res = await apiFetch(`/api/settings/channels/${editingChannel.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Error al actualizar el canal', 'error');
        return;
      }

      addToast('Canal actualizado con éxito y credenciales re-cifradas', 'success');
      setEditingChannel(null);
      loadChannels();
    } catch (err) {
      addToast('Error al actualizar canal: ' + err.message, 'error');
    } finally {
      setEditChannelSubmitting(false);
    }
  };

  // Handler: Probar y Verificar Canal en vivo con Meta
  const handleTestChannel = async (id) => {
    setTestingChannelId(id);
    try {
      const res = await apiFetch(`/api/settings/channels/${id}/test`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast(`✅ Conexión con Meta validada: ${data.message || 'Canal activo'}`, 'success');
        loadChannels();
      } else {
        addToast(`❌ Validación fallida: ${data.error || 'Token inválido en Meta'}`, 'error');
        loadChannels();
      }
    } catch (err) {
      addToast('Error al probar canal: ' + err.message, 'error');
    } finally {
      setTestingChannelId(null);
    }
  };

  // Handler: Toggle Estado Canal
  const handleToggleChannelStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await apiFetch(`/api/settings/channels/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        addToast(`Canal ${newStatus === 'active' ? 'activado' : 'pausado'} correctamente`, 'success');
        loadChannels();
      } else {
        addToast('Error al actualizar estado del canal', 'error');
      }
    } catch (err) {
      addToast('Error de red: ' + err.message, 'error');
    }
  };

  // Handler: Eliminar Canal
  const handleDeleteChannel = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este canal? Los mensajes y contactos permanecerán en el historial.')) {
      return;
    }

    try {
      const res = await apiFetch(`/api/settings/channels/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        addToast('Canal eliminado con éxito', 'success');
        loadChannels();
      } else {
        addToast('Error al eliminar canal', 'error');
      }
    } catch (err) {
      addToast('Error de red: ' + err.message, 'error');
    }
  };

  // Handler: Guardar Bot
  const handleSaveBot = async (e) => {
    e.preventDefault();
    setBotSaving(true);

    try {
      const res = await apiFetch('/api/settings/bot', {
        method: 'POST',
        body: JSON.stringify({
          channelId: null,
          isEnabled: botSettings.is_enabled,
          welcomeMessage: botSettings.welcome_message,
          inactivityHours: parseInt(botSettings.inactivity_hours, 10)
        })
      });

      if (res.ok) {
        addToast('Configuración del Chatbot guardada exitosamente', 'success');
      } else {
        const errData = await res.json();
        addToast(errData.error || 'Error al guardar configuración', 'error');
      }
    } catch (err) {
      addToast('Error de red al guardar bot: ' + err.message, 'error');
    } finally {
      setBotSaving(false);
    }
  };

  // Handler: Crear Usuario
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserSubmitting(true);

    try {
      const res = await apiFetch('/api/settings/users', {
        method: 'POST',
        body: JSON.stringify(userForm)
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Error al crear usuario', 'error');
        return;
      }

      addToast('Operador registrado con éxito en el sistema', 'success');
      setShowUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'agent', channelIds: [] });
      loadUsers();
    } catch (err) {
      addToast('Error de red al crear usuario: ' + err.message, 'error');
    } finally {
      setUserSubmitting(false);
    }
  };

  // Traer del servidor el App ID y el ID de configuración del login de Meta.
  // Antes estaban escritos a mano en el código; ahora salen del .env del backend.
  const loadMetaAppInfo = async () => {
    try {
      const res = await apiFetch('/api/settings/channels/meta-app-info');
      if (!res.ok) return;
      const data = await res.json();
      if (data.appId) setMetaAppId(data.appId);
      if (data.loginConfigId) setMetaConfigId(data.loginConfigId);
    } catch (err) {
      console.warn('No se pudo obtener la configuración de Meta:', err.message);
    }
  };

  // Handler: abrir el editor de canales de un operador
  const openChannelsModal = (u) => {
    setChannelsModalUser(u);
    setChannelsDraft(Array.isArray(u.channel_ids) ? u.channel_ids.map(Number) : []);
  };

  // Handler: guardar los canales asignados a un operador
  const handleSaveUserChannels = async () => {
    if (!channelsModalUser) return;
    setChannelsSaving(true);

    try {
      const res = await apiFetch(`/api/settings/users/${channelsModalUser.id}/channels`, {
        method: 'PUT',
        body: JSON.stringify({ channelIds: channelsDraft })
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'No se pudieron guardar los canales', 'error');
        return;
      }

      addToast(data.message || 'Canales actualizados', 'success');
      setChannelsModalUser(null);
      loadUsers();
    } catch (err) {
      addToast('Error de red al guardar canales: ' + err.message, 'error');
    } finally {
      setChannelsSaving(false);
    }
  };

  // Alterna un canal dentro de una lista de IDs
  const toggleChannelId = (lista, channelId) => (
    lista.includes(channelId) ? lista.filter(id => id !== channelId) : [...lista, channelId]
  );

  // Variable Pill Click
  const insertVariable = (variable) => {
    setBotSettings(prev => ({
      ...prev,
      welcome_message: prev.welcome_message + variable
    }));
  };

  // Preview Formatter
  const formatBotPreview = (text) => {
    return (text || 'Escribe un mensaje...')
      .replace(/\{\{cliente\}\}/g, 'María')
      .replace(/\{\{canal\}\}/g, 'WhatsApp Lecturas');
  };

  // Escanear Fan Pages de Facebook
  const handleScanFacebook = async (tokenToUse) => {
    const token = typeof tokenToUse === 'string' ? tokenToUse : scanToken;
    if (!token || !token.trim()) {
      setScanError('Por favor ingresa un User Access Token de Meta o conecta con Facebook.');
      return;
    }

    setScanning(true);
    setScanError('');
    setScannedPages([]);
    setMissingPerms([]);

    try {
      const res = await apiFetch('/api/settings/channels/scan-facebook-pages', {
        method: 'POST',
        body: JSON.stringify({ userToken: token.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error || 'Error al escanear páginas.');
        return;
      }

      setScannedPages(data.pages || []);
      setMissingPerms(data.missingRecommended || []);
      const unconn = [...new Set((data.pages || []).filter(p => !p.alreadyConnected).map(p => p.id))];
      setSelectedPagesToConnect(unconn);

      if ((data.pages || []).length === 0) {
        setScanError('Meta no devolvió ninguna Fan Page para este token. Asegúrate de que el token cuente con los permisos "pages_show_list" y "pages_messaging" en Meta Developers.');
      } else {
        addToast(`Se encontraron ${data.pages.length} Fan Page(s) de Facebook.`, 'success');
      }
    } catch (err) {
      setScanError('Error de red al escanear: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  // Escanear a partir del código que devuelve el Login for Business.
  // El canje por token lo hace el backend, porque necesita el App Secret.
  const handleScanConCodigo = async (code) => {
    try {
      const res = await apiFetch('/api/settings/channels/facebook-exchange-code', {
        method: 'POST',
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error || 'Meta rechazó la autorización.');
        setScannedPages([]);
        return;
      }

      setScannedPages(data.pages || []);
      setMissingPerms(data.missingRecommended || []);
      setScanError('');

      if ((data.pages || []).length === 0) {
        setScanError('Meta autorizó, pero no devolvió ninguna página. Revisá que hayas marcado tus páginas al conceder permisos.');
      }
    } catch (err) {
      setScanError('Error de red al canjear la autorización: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  // Conectar con Facebook.
  //
  // Requiere que en la app de Meta esté habilitado el inicio de sesión con el
  // SDK de JavaScript y que el dominio figure entre los permitidos.
  // Si Meta llegara a devolver un 'code' en vez de un token, también se soporta:
  // el backend lo canjea en /channels/facebook-exchange-code.
  const handleFacebookConnect = () => {
    setScanError('');
    setScannedPages([]);

    setScanning(true);

    // Si el usuario cierra la ventana de Meta o el diálogo no responde, la
    // interfaz no puede quedar girando para siempre.
    let resuelto = false;
    const tiempoLimite = setTimeout(() => {
      if (!resuelto) {
        setScanning(false);
        setScanError('Meta no respondió. Puede que hayas cerrado la ventana, o que la configuración del inicio de sesión no esté completa.');
      }
    }, 90000);

    const finalizar = () => { resuelto = true; clearTimeout(tiempoLimite); };

    const triggerLogin = () => {
      try {
        window.FB.login((response) => {
          const auth = response?.authResponse;

          if (!auth) {
            finalizar();
            setScanning(false);
            setScanError('Inicio de sesión con Facebook cancelado o no autorizado.');
            return;
          }

          finalizar();

          // El Login for Business devuelve normalmente un 'code' de un solo uso.
          // Algunas configuraciones devuelven el token directo: soportamos ambos.
          if (auth.code) {
            handleScanConCodigo(auth.code);
          } else if (auth.accessToken) {
            setScanToken(auth.accessToken);
            handleScanFacebook(auth.accessToken);
          } else {
            setScanning(false);
            setScanError('Meta autorizó pero no devolvió ni código ni token.');
          }
        }, {
          // Flujo clásico por permisos: es el que funciona con esta app una vez
          // habilitado el inicio de sesión con el SDK de JavaScript en Meta.
          scope: 'pages_show_list,pages_messaging,pages_manage_metadata,instagram_basic,instagram_manage_messages',
          return_scopes: true
        });
      } catch (err) {
        finalizar();
        setScanning(false);
        setScanError('No se pudo abrir el diálogo de Facebook: ' + err.message);
      }
    };

    if (window.FB) {
      triggerLogin();
    } else {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: metaAppId,
          cookie: true,
          xfbml: false,
          version: 'v26.0'
        });
        triggerLogin();
      };

      if (!document.getElementById('facebook-jssdk')) {
        const js = document.createElement('script');
        js.id = 'facebook-jssdk';
        js.src = 'https://connect.facebook.net/es_LA/sdk.js';
        js.onerror = () => {
          finalizar();
          setScanning(false);
          setScanError('No se pudo cargar el SDK de Facebook. Revisá tu conexión o si algún bloqueador lo está frenando.');
        };
        document.head.appendChild(js);
      } else {
        setTimeout(triggerLogin, 600);
      }
    }
  };

  // Conectar Fan Pages seleccionadas
  const handleConnectSelectedPages = async () => {
    if (connectingPages) return;

    const seenIds = new Set();
    const pagesToSubmit = scannedPages
      .filter(p => selectedPagesToConnect.includes(p.id) && !seenIds.has(p.id) && seenIds.add(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        accessToken: p.accessToken,
        connectInstagram: true,
        instagram: p.instagram
      }));

    if (pagesToSubmit.length === 0) {
      addToast('Selecciona al menos una página para conectar.', 'error');
      return;
    }

    setConnectingPages(true);

    try {
      const res = await apiFetch('/api/settings/channels/connect-facebook-pages', {
        method: 'POST',
        body: JSON.stringify({ pages: pagesToSubmit })
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Error al conectar páginas.', 'error');
        return;
      }

      addToast(data.message || 'Páginas conectadas exitosamente al sistema', 'success');
      setShowScannerModal(false);
      loadChannels();
    } catch (err) {
      addToast('Error al conectar páginas: ' + err.message, 'error');
    } finally {
      setConnectingPages(false);
    }
  };

  return (
    <main className="settings-main">
      <div className="page-header">
        <h2>Panel de Control y Configuración</h2>
        <p>
          Administración centralizada de cuentas de Meta v26.0, reglas del bot de bienvenida,
          operadores de atención y auditoría de eventos en tiempo real.
        </p>
      </div>

      {/* Tabs */}
      <nav className="settings-tabs" role="tablist">
        <button
          className={`tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          <span>📱 Canales Conectados</span>
          <span className="tab-counter">{channels.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'bot' ? 'active' : ''}`}
          onClick={() => setActiveTab('bot')}
        >
          <span>🤖 Chatbot Automático</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span>👥 Operadores y Equipo</span>
          <span className="tab-counter">{users.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <span>📜 Auditoría de Webhooks</span>
        </button>
      </nav>

      {/* PESTAÑA 1: CANALES */}
      {activeTab === 'channels' && (
        <section className="tab-panel active">
          <div className="panel-action-bar">
            <div className="panel-title">
              <h3>Cuentas de Mensajería Conectadas</h3>
              <p>Credenciales cifradas con AES-256-GCM para WhatsApp Cloud API, Instagram y Facebook.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowScannerModal(true);
                  setScanError('');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                title="Escanear y vincular automáticamente todas las Fan Pages de Facebook de tu perfil"
              >
                <span>⚡</span>
                <span>Escanear Páginas de Facebook</span>
              </button>
              <button
                className="btn-primary-gold"
                onClick={() => setShowChannelModal(true)}
              >
                <span>+</span>
                <span>Conectar Canal Manual</span>
              </button>
            </div>
          </div>

          {channels.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-state-icon">🔮</div>
              <h4>No hay canales conectados</h4>
              <p>Conecta tu primer número de WhatsApp Cloud API o Fan Page para comenzar a recibir consultas.</p>
              <button
                className="btn-primary-gold"
                onClick={() => setShowChannelModal(true)}
              >
                Conectar Primer Canal
              </button>
            </div>
          ) : (
            <div className="channels-grid">
              {channels.map(ch => {
                const platformIcon = ch.platform === 'whatsapp' ? '📱' : ch.platform === 'instagram' ? '📷' : '💬';
                const statusLabel = ch.status === 'active' ? 'Activo' : ch.status === 'paused' ? 'Pausado' : 'Error';

                return (
                  <div key={ch.id} className="channel-card">
                    <div>
                      <div className="channel-card-header">
                        <span className={`platform-badge ${ch.platform}`}>
                          <span>{platformIcon}</span>
                          <span>{ch.platform}</span>
                        </span>
                        <span className={`status-dot ${ch.status}`}>{statusLabel}</span>
                      </div>
                      <h4 className="channel-title">{ch.name}</h4>
                      <span className="channel-id-code">ID: {ch.channel_identifier}</span>
                      {ch.error_message && (
                        <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '6px' }}>
                          ⚠️ {ch.error_message}
                        </p>
                      )}
                    </div>

                    <div className="channel-footer">
                      <div className="channel-color-tag">
                        <span className="color-dot" style={{ background: ch.color_tag || '#00a884' }}></span>
                        <span>Etiqueta</span>
                      </div>
                      <div className="channel-card-actions">
                        <button
                          className="btn-card-action"
                          onClick={() => handleTestChannel(ch.id)}
                          disabled={testingChannelId === ch.id}
                          title="Probar token y conectividad con Meta Graph API"
                          style={{ color: 'var(--gold-light)' }}
                        >
                          {testingChannelId === ch.id ? 'Probando...' : '⚡ Probar'}
                        </button>
                        <button
                          className="btn-card-action"
                          onClick={() => handleOpenEditChannel(ch)}
                          title="Editar nombre, identificador o renovar token de acceso"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn-card-action"
                          onClick={() => handleToggleChannelStatus(ch.id, ch.status)}
                        >
                          {ch.status === 'active' ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          className="btn-card-action btn-card-delete"
                          onClick={() => handleDeleteChannel(ch.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* PESTAÑA 2: CHATBOT */}
      {activeTab === 'bot' && (
        <section className="tab-panel active">
          <div className="panel-action-bar">
            <div className="panel-title">
              <h3>Chatbot de Bienvenida y Handover</h3>
              <p>Configura la respuesta automática inmediata que reciben los clientes al enviar su primer mensaje.</p>
            </div>
          </div>

          <div className="bot-settings-card">
            <div className="bot-toggle-row">
              <div className="bot-toggle-info">
                <h4>Estado del Bot Automático</h4>
                <p>Si está activo, el sistema responderá automáticamente con el mensaje de saludo a clientes nuevos.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={botSettings.is_enabled}
                  onChange={(e) => setBotSettings(prev => ({ ...prev, is_enabled: e.target.checked }))}
                />
                <span className="slider"></span>
              </label>
            </div>

            <form onSubmit={handleSaveBot}>
              <div className="form-group-custom">
                <label>Ventana de inactividad para re-saludar (horas):</label>
                <select
                  className="input-custom"
                  value={botSettings.inactivity_hours}
                  onChange={(e) => setBotSettings(prev => ({ ...prev, inactivity_hours: e.target.value }))}
                >
                  <option value="6">6 horas</option>
                  <option value="12">12 horas</option>
                  <option value="24">24 horas (Recomendado)</option>
                  <option value="48">48 horas</option>
                </select>
              </div>

              <div className="form-group-custom">
                <label>Mensaje de Bienvenida:</label>
                <div className="variable-pills">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                    Variables dinámicas:
                  </span>
                  <button
                    type="button"
                    className="pill-tag"
                    onClick={() => insertVariable('{{cliente}}')}
                  >
                    + &#123;&#123;cliente&#125;&#125;
                  </button>
                  <button
                    type="button"
                    className="pill-tag"
                    onClick={() => insertVariable('{{canal}}')}
                  >
                    + &#123;&#123;canal&#125;&#125;
                  </button>
                </div>
                <textarea
                  className="textarea-custom"
                  rows="4"
                  placeholder="Escribe el saludo celestial del bot..."
                  value={botSettings.welcome_message}
                  onChange={(e) => setBotSettings(prev => ({ ...prev, welcome_message: e.target.value }))}
                />
              </div>

              {/* Vista Previa de Burbuja */}
              <div className="form-group-custom">
                <label>Vista previa en vivo del mensaje:</label>
                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ background: '#18223c', borderLeft: '3px solid var(--gold-primary)', borderRadius: '8px', padding: '12px 16px', maxWidth: '450px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--gold-light)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      🤖 BOT DE LECTURAS DE TARDE
                    </span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-pure)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {formatBotPreview(botSettings.welcome_message)}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  className="btn-primary-gold"
                  disabled={botSaving}
                >
                  <span>{botSaving ? 'Guardando...' : 'Guardar Configuración del Bot'}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* PESTAÑA 3: OPERADORES */}
      {activeTab === 'users' && (
        <section className="tab-panel active">
          <div className="panel-action-bar">
            <div className="panel-title">
              <h3>Operadores y Equipo del Sistema</h3>
              <p>Gestión de cuentas con acceso a la bandeja de mensajes y control de roles RBAC.</p>
            </div>
            <button
              className="btn-primary-gold"
              onClick={() => setShowUserModal(true)}
            >
              <span>+</span>
              <span>Dar de Alta Operador</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Correo Electrónico</th>
                  <th>Rol de Acceso</th>
                  <th>Canales que ve</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-pure)' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === 'admin' ? 'Administrador' : 'Operador'}
                      </span>
                    </td>
                    <td>
                      {u.role === 'admin' ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Todos</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {(u.channel_ids || []).length === 0 ? (
                            <span
                              style={{ color: 'var(--warn)', fontSize: '0.85rem', fontWeight: 600 }}
                              title="Sin canales asignados este operador entra y no ve ninguna conversación"
                            >
                              Ninguno &mdash; bandeja vacía
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.85rem' }}>
                              {(u.channel_ids || [])
                                .map(id => channels.find(c => c.id === id)?.name || `#${id}`)
                                .join(', ')}
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn-card-action"
                            onClick={() => openChannelsModal(u)}
                          >
                            Editar
                          </button>
                        </div>
                      )}
                    </td>
                    <td><span className="status-dot active">Activo</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* PESTAÑA 4: LOGS */}
      {activeTab === 'logs' && (
        <section className="tab-panel active">
          <div className="panel-action-bar">
            <div className="panel-title">
              <h3>Monitor de Webhooks y Auditoría Meta</h3>
              <p>Historial de peticiones crudas recibidas desde Meta Graph API con firmas HMAC-SHA256 validadas.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                className="input-custom"
                style={{ width: 'auto', padding: '6px 12px' }}
                value={logsLimit}
                onChange={(e) => {
                  const lim = parseInt(e.target.value, 10);
                  setLogsLimit(lim);
                  loadLogs(lim);
                }}
              >
                <option value="25">Últimos 25</option>
                <option value="50">Últimos 50</option>
                <option value="100">Últimos 100</option>
              </select>
              <button
                className="btn-secondary"
                onClick={() => loadLogs(logsLimit)}
              >
                🔄 Refrescar
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha y Hora</th>
                  <th>Plataforma</th>
                  <th>Identificador</th>
                  <th>Evento</th>
                  <th>Estado</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      Aún no se han registrado eventos de webhooks de Meta.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('es-ES') : '-';
                    const statusClass = log.status === 'PROCESSED' ? 'active' : log.status === 'ERROR' ? 'error' : 'paused';

                    return (
                      <tr key={log.id}>
                        <td>#{log.id}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{dateStr}</td>
                        <td><strong style={{ textTransform: 'uppercase' }}>{log.platform || '-'}</strong></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.channel_identifier || 'Global'}</td>
                        <td><code>{log.event_type || 'evento'}</code></td>
                        <td><span className={`status-dot ${statusClass}`}>{log.status || 'PROCESSED'}</span></td>
                        <td>
                          <button
                            className="btn-card-action"
                            onClick={() => {
                              const content = typeof log.payload_json === 'string'
                                ? JSON.stringify(JSON.parse(log.payload_json), null, 2)
                                : JSON.stringify(log.payload_json, null, 2);
                              setJsonModalContent(content);
                            }}
                          >
                            Ver JSON
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL: CONECTAR CANAL */}
      {showChannelModal && (
        <div className="modal-overlay active" onClick={() => setShowChannelModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Conectar Canal de Meta</h3>
              <button className="btn-close-modal" onClick={() => setShowChannelModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group-custom">
                <label>Plataforma:</label>
                <select
                  className="input-custom"
                  value={channelForm.platform}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, platform: e.target.value }))}
                >
                  <option value="whatsapp">📱 WhatsApp Cloud API</option>
                  <option value="facebook">💬 Facebook Messenger (Fan Page)</option>
                  <option value="instagram">📷 Instagram Direct (Cuenta Profesional)</option>
                </select>
              </div>

              {/* Banner de recomendación para Facebook e Instagram */}
              {channelForm.platform !== 'whatsapp' && (
                <div style={{ background: 'rgba(24, 119, 242, 0.1)', border: '1px solid rgba(24, 119, 242, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: '#93c5fd', lineHeight: '1.4' }}>
                  💡 <strong>¿No quieres buscar IDs numéricos?</strong> Puedes cerrar este formulario y usar el botón <strong>⚡ Escanear Páginas de Facebook</strong> en el panel principal para detectar y conectar tus páginas automáticamente en 1 clic.
                </div>
              )}

              <div className="form-group-custom">
                <label>Nombre descriptivo / Alias:</label>
                <input
                  type="text"
                  className="input-custom"
                  placeholder={
                    channelForm.platform === 'whatsapp'
                      ? 'Ej: WhatsApp Ventas'
                      : channelForm.platform === 'facebook'
                      ? 'Ej: Fan Page del negocio'
                      : 'Ej: Instagram @tucuenta'
                  }
                  required
                  value={channelForm.name}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group-custom">
                <label>
                  {channelForm.platform === 'whatsapp' && 'Identificador del Número de Teléfono (Phone Number ID):'}
                  {channelForm.platform === 'facebook' && 'Identificador de la Fan Page de Facebook (Page ID):'}
                  {channelForm.platform === 'instagram' && 'Identificador de la Cuenta Comercial de Instagram (Instagram Business ID):'}
                </label>
                <input
                  type="text"
                  name="meta_channel_identifier_field"
                  autoComplete="off"
                  className="input-custom"
                  placeholder={
                    channelForm.platform === 'whatsapp'
                      ? 'Ej: 1111313208738572 (15 o 16 dígitos)'
                      : channelForm.platform === 'facebook'
                      ? 'Ej: 104589218938291 (ID de tu Fan Page)'
                      : 'Ej: 17841400123456789 (ID de cuenta Instagram Business)'
                  }
                  required
                  value={channelForm.channelIdentifier}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, channelIdentifier: e.target.value }))}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  {channelForm.platform === 'whatsapp' && 'Cópialo desde Meta for Developers → WhatsApp → Primeros pasos → Identificador de número de teléfono.'}
                  {channelForm.platform === 'facebook' && 'Lo encuentras en tu Página de Facebook → Configuración → Información de la página → ID de la página.'}
                  {channelForm.platform === 'instagram' && 'Identificador de la cuenta de Instagram Business vinculada a tu Fan Page de Facebook.'}
                </span>
              </div>

              <div className="form-group-custom">
                <label>Access Token Permanente (Graph API):</label>
                <input
                  type="password"
                  className="input-custom"
                  placeholder="EAAB..."
                  required
                  autoComplete="off"
                  value={channelForm.accessToken}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, accessToken: e.target.value }))}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Se cifrará inmediatamente en PostgreSQL con AES-256-GCM.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group-custom">
                  <label>App ID (Opcional):</label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="ID de App Meta"
                    value={channelForm.appId}
                    onChange={(e) => setChannelForm(prev => ({ ...prev, appId: e.target.value }))}
                  />
                </div>
                <div className="form-group-custom">
                  <label>Color de Etiqueta:</label>
                  <input
                    type="color"
                    className="input-custom"
                    value={channelForm.colorTag}
                    onChange={(e) => setChannelForm(prev => ({ ...prev, colorTag: e.target.value }))}
                    style={{ height: '44px', padding: '4px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label>App Secret (Opcional para HMAC):</label>
                <input
                  type="password"
                  className="input-custom"
                  placeholder="Meta App Secret"
                  autoComplete="off"
                  value={channelForm.appSecret}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, appSecret: e.target.value }))}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowChannelModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-gold"
                  disabled={channelSubmitting}
                >
                  {channelSubmitting ? 'Guardando y cifrando...' : 'Guardar y Conectar Canal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CANAL */}
      {editingChannel && (
        <div className="modal-overlay active" onClick={() => setEditingChannel(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Canal: {editingChannel.name}</h3>
              <button className="btn-close-modal" onClick={() => setEditingChannel(null)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateChannel}>
              <div className="form-group-custom">
                <label>Plataforma:</label>
                <input
                  type="text"
                  className="input-custom"
                  value={editingChannel.platform ? editingChannel.platform.toUpperCase() : ''}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group-custom">
                <label>Nombre descriptivo / Alias:</label>
                <input
                  type="text"
                  className="input-custom"
                  required
                  value={editChannelForm.name}
                  onChange={(e) => setEditChannelForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group-custom">
                <label>
                  {editingChannel.platform === 'whatsapp' ? 'Identificador del Número de Teléfono (Phone Number ID):' : 'Identificador de la Fan Page (Page ID):'}
                </label>
                <input
                  type="text"
                  className="input-custom"
                  required
                  value={editChannelForm.channelIdentifier}
                  onChange={(e) => setEditChannelForm(prev => ({ ...prev, channelIdentifier: e.target.value }))}
                />
              </div>

              <div className="form-group-custom">
                <label>Nuevo Access Token de Meta (Opcional):</label>
                <input
                  type="password"
                  className="input-custom"
                  placeholder="Dejar en blanco para conservar el token actual, o pegar nuevo EAA..."
                  autoComplete="off"
                  value={editChannelForm.accessToken}
                  onChange={(e) => setEditChannelForm(prev => ({ ...prev, accessToken: e.target.value }))}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Si el token venció o cambió en Meta Developers, pégalo aquí para re-cifrarlo con AES-256-GCM.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group-custom">
                  <label>Estado:</label>
                  <select
                    className="input-custom"
                    value={editChannelForm.status}
                    onChange={(e) => setEditChannelForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Activo</option>
                    <option value="paused">Pausado</option>
                  </select>
                </div>
                <div className="form-group-custom">
                  <label>Color de Etiqueta:</label>
                  <input
                    type="color"
                    className="input-custom"
                    value={editChannelForm.colorTag}
                    onChange={(e) => setEditChannelForm(prev => ({ ...prev, colorTag: e.target.value }))}
                    style={{ height: '44px', padding: '4px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingChannel(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-gold"
                  disabled={editChannelSubmitting}
                >
                  {editChannelSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR OPERADOR */}
      {showUserModal && (
        <div className="modal-overlay active" onClick={() => setShowUserModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Dar de Alta Operador / Asesor</h3>
              <button className="btn-close-modal" onClick={() => setShowUserModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group-custom">
                <label>Nombre del Operador:</label>
                <input
                  type="text"
                  className="input-custom"
                  placeholder="Ej: Laura Gómez"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group-custom">
                <label>Correo Electrónico:</label>
                <input
                  type="email"
                  className="input-custom"
                  placeholder="operador@lecturasdetarde.online"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="form-group-custom">
                <label>Contraseña de Acceso:</label>
                <input
                  type="password"
                  className="input-custom"
                  placeholder="Mínimo 12 caracteres"
                  required
                  minLength="12"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div className="form-group-custom">
                <label>Rol en la Plataforma:</label>
                <select
                  className="input-custom"
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="agent">Operador / Asesor (Solo Inbox)</option>
                  <option value="admin">Administrador Total (Settings + Inbox)</option>
                </select>
              </div>

              {userForm.role === 'agent' && (
                <div className="form-group-custom">
                  <label>Canales que podrá ver:</label>
                  {channels.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                      Todavía no hay canales conectados. Podés crear el operador ahora y asignarle
                      canales más tarde desde la tabla.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {channels.map(c => (
                          <label
                            key={c.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 400, cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={userForm.channelIds.includes(c.id)}
                              onChange={() => setUserForm(prev => ({
                                ...prev,
                                channelIds: toggleChannelId(prev.channelIds, c.id)
                              }))}
                            />
                            <span className="color-dot" style={{ background: c.color_tag || '#00a884' }}></span>
                            <span>{c.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({c.platform})</span>
                          </label>
                        ))}
                      </div>
                      {userForm.channelIds.length === 0 && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--warn)', margin: '10px 0 0' }}>
                          Sin canales marcados, esta persona va a entrar y no va a ver ninguna conversación.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-gold"
                  disabled={userSubmitting}
                >
                  {userSubmitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANALES DE UN OPERADOR (A-03) */}
      {channelsModalUser && (
        <div className="modal-overlay active" onClick={() => setChannelsModalUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Canales de {channelsModalUser.name}</h3>
              <button className="btn-close-modal" onClick={() => setChannelsModalUser(null)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Este operador solo verá las conversaciones de los canales que marques. Si no marcás
              ninguno, entra a la bandeja y no ve nada.
            </p>

            {channels.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--warn)' }}>
                No hay canales conectados todavía. Conectá uno en la pestaña de Canales.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {channels.map(c => (
                  <label
                    key={c.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={channelsDraft.includes(c.id)}
                      onChange={() => setChannelsDraft(prev => toggleChannelId(prev, c.id))}
                    />
                    <span className="color-dot" style={{ background: c.color_tag || '#00a884' }}></span>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({c.platform})</span>
                  </label>
                ))}
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setChannelsModalUser(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-gold"
                onClick={handleSaveUserChannels}
                disabled={channelsSaving}
              >
                {channelsSaving ? 'Guardando...' : 'Guardar canales'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER JSON */}
      {jsonModalContent && (
        <div className="modal-overlay active" onClick={() => setJsonModalContent(null)}>
          <div className="modal-dialog" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payload Crudo del Webhook</h3>
              <button className="btn-close-modal" onClick={() => setJsonModalContent(null)}>&times;</button>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', maxHeight: '400px', overflowY: 'auto' }}>
              <pre style={{ color: '#a5f3fc', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {jsonModalContent}
              </pre>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary-gold"
                onClick={() => {
                  navigator.clipboard.writeText(jsonModalContent);
                  addToast('Payload JSON copiado al portapapeles', 'success');
                }}
              >
                Copiar JSON
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setJsonModalContent(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESCÁNER DE PÁGINAS DE FACEBOOK */}
      {showScannerModal && (
        <div className="modal-overlay active" onClick={() => setShowScannerModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>⚡</span>
                <div>
                  <h3>Escanear y Conectar Fan Pages de Facebook</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Detecta automáticamente todas las páginas de tu perfil y suscríbelas a Messenger e Instagram
                  </p>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setShowScannerModal(false)}>&times;</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Meta App Info Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(24, 119, 242, 0.1)', border: '1px solid rgba(24, 119, 242, 0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '0.82rem', color: '#93c5fd' }}>
                  <strong>Meta App ID:</strong> <code>{metaAppId}</code> (Vinculada y Activa)
                </div>
                <span style={{ fontSize: '0.75rem', background: '#1877F2', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  v26.0
                </span>
              </div>

              {/* Botón 1-Click: Conectar con Facebook */}
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <button
                  type="button"
                  onClick={handleFacebookConnect}
                  disabled={scanning}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '13px 20px',
                    background: '#1877F2',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: scanning ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(24, 119, 242, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#166fe5'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#1877F2'}
                >
                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>f</span>
                  <span>{scanning ? 'Conectando con Meta...' : 'Conectar con Facebook (Escaneo Automático)'}</span>
                </button>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Abre la ventana oficial de Meta para conceder acceso a tus Fan Pages en 1 clic
                </div>
              </div>

              {/* Separador */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '2px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  O ingresa un User Access Token manualmente
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
              </div>

              {/* Instrucción de permisos */}
              <div style={{ background: 'rgba(0, 168, 132, 0.08)', border: '1px solid var(--border-gold)', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gold-light)', marginBottom: '4px' }}>
                  🔑 Permisos necesarios en Meta para escanear páginas:
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  El token debe contener los permisos: <code style={{ color: '#93c5fd' }}>pages_show_list</code>, <code style={{ color: '#93c5fd' }}>pages_messaging</code> y <code style={{ color: '#93c5fd' }}>pages_manage_metadata</code>.
                  Puedes generarlo desde <strong>Meta for Developers → Herramientas → Graph API Explorer</strong> seleccionando tu aplicación.
                </div>
              </div>

              {/* Input de Token */}
              <div className="form-group-custom" style={{ margin: 0 }}>
                <label>Token de Acceso de Usuario de Meta (User Access Token):</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="password"
                    className="input-custom"
                    placeholder="EAAB... (Pega tu User Access Token con permisos de páginas)"
                    value={scanToken}
                    onChange={(e) => setScanToken(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary-gold"
                    onClick={() => handleScanFacebook()}
                    disabled={scanning || !scanToken.trim()}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {scanning ? 'Escaneando...' : '🔍 Escanear'}
                  </button>
                </div>
              </div>

              {/* Error si ocurre */}
              {scanError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.82rem' }}>
                  ⚠️ {scanError}
                </div>
              )}

              {/* Alerta de permisos faltantes */}
              {missingPerms.length > 0 && (
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', padding: '10px 14px', color: '#fcd34d', fontSize: '0.8rem' }}>
                  ⚠️ Al token actual le faltan los siguientes permisos recomendados para mensajería: {missingPerms.join(', ')}
                </div>
              )}

              {/* Lista de páginas detectadas */}
              {scannedPages.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      Páginas encontradas ({scannedPages.length}):
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Selecciona las que deseas dar de alta en el sistema
                    </span>
                  </div>

                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {scannedPages.map(page => {
                      const isSelected = selectedPagesToConnect.includes(page.id);
                      return (
                        <div
                          key={page.id}
                          onClick={() => {
                            if (page.alreadyConnected) return;
                            setSelectedPagesToConnect(prev =>
                              prev.includes(page.id) ? prev.filter(x => x !== page.id) : [...prev, page.id]
                            );
                          }}
                          style={{
                            background: isSelected ? 'rgba(37, 211, 102, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${isSelected ? 'rgba(37, 211, 102, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                            borderRadius: '10px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: page.alreadyConnected ? 'default' : 'pointer',
                            opacity: page.alreadyConnected ? 0.6 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={page.alreadyConnected}
                              onChange={() => {}}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--gold-primary)' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '1.1rem' }}>📘</span>
                                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-pure)' }}>
                                  {page.name}
                                </span>
                                <span style={{ fontSize: '0.72rem', background: 'rgba(24, 119, 242, 0.2)', color: '#93c5fd', padding: '2px 8px', borderRadius: '12px' }}>
                                  {page.category}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Identificador en Meta: <code>{page.id}</code>
                              </div>
                              {page.instagram && (
                                <div style={{ fontSize: '0.74rem', color: '#f472b6', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>📷</span>
                                  <span>Cuenta de Instagram vinculada: <strong>@{page.instagram.username}</strong></span>
                                  {page.instagram.alreadyConnected && (
                                    <span style={{ color: 'var(--wa-green)', fontWeight: 600 }}>(Ya vinculada)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            {page.alreadyConnected ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--wa-green)', background: 'rgba(37, 211, 102, 0.15)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(37, 211, 102, 0.3)' }}>
                                ✓ Ya Conectada
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.15)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                                Lista para Conectar
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowScannerModal(false)}
              >
                Cerrar
              </button>

              {scannedPages.length > 0 && (
                <button
                  type="button"
                  className="btn-primary-gold"
                  disabled={connectingPages || selectedPagesToConnect.length === 0}
                  onClick={handleConnectSelectedPages}
                >
                  {connectingPages
                    ? 'Conectando y suscribiendo...'
                    : `Conectar ${selectedPagesToConnect.length} Página(s)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-msg ${t.type}`}>
            <span>{t.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

export default SettingsPage;
